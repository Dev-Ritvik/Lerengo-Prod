import { createHash, randomUUID } from "node:crypto";

export type DetectedImageFormat = "jpeg" | "png" | "webp" | "unknown";

export type ImageInspection = {
  aspectRatio: number | null;
  detectedFormat: DetectedImageFormat;
  height: number | null;
  megapixels: number | null;
  signatureValid: boolean;
  width: number | null;
};

type UniversityConfig = {
  domain: string | null;
  keywords: string[];
  min_score: number;
  name: string;
  name_variants: string[];
  reg_id_regex: string[];
};

export type VerificationEvaluationInput = {
  allowAutoApprove?: boolean;
  declaredRegId: string | null | undefined;
  email: string | null | undefined;
  fileName: string;
  fileSize: number;
  fullName: string | null;
  imageInspection: ImageInspection;
  university: UniversityConfig;
};

export type VerificationEvaluationResult = {
  decision: "approved" | "pending" | "rejected";
  reasons: Record<string, unknown>;
  regIdCandidate: string | null;
  score: number;
};

function firstToken(value: string | null) {
  if (!value) {
    return "";
  }

  const token = value.trim().split(/\s+/)[0] ?? "";
  return token.toLowerCase();
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9@.\s_-]+/g, " ");
}

function normalizeRegId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 6) {
    return null;
  }

  return normalized;
}

function findRegIdCandidate(text: string) {
  const match = text.match(/[a-z]{0,4}\d{4,12}[a-z0-9]{0,4}/i);
  return match ? match[0].toUpperCase() : null;
}

function matchesAnyRegex(candidate: string | null, regexList: string[]) {
  if (!candidate || regexList.length === 0) {
    return false;
  }

  for (const pattern of regexList) {
    try {
      const expr = new RegExp(pattern, "i"); // nosemgrep
      if (expr.test(candidate)) {
        return true;
      }
    } catch {
      // Ignore invalid regex patterns in config.
    }
  }

  return false;
}

function hasUniversityKeyword(text: string, university: UniversityConfig) {
  const allKeywords = [
    university.name,
    ...university.name_variants,
    ...university.keywords,
  ]
    .map((word) => normalizeText(word).trim())
    .filter(Boolean);

  return allKeywords.some((word) => text.includes(word));
}

function hasDomainSignal(email: string | null | undefined, domain: string | null) {
  if (!email || !domain) {
    return false;
  }

  const normalizedEmail = email.toLowerCase();
  const normalizedDomain = domain.toLowerCase();
  return normalizedEmail.endsWith(`@${normalizedDomain}`);
}

function hasImageExtension(fileName: string) {
  return /\.(jpe?g|png|webp)$/i.test(fileName);
}

function asciiSlice(data: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...data.slice(start, start + length));
}

function inspectPngDimensions(data: Uint8Array) {
  const isPngSignature =
    data.length >= 24 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a;

  if (!isPngSignature) {
    return null;
  }

  const width =
    ((data[16] << 24) |
    (data[17] << 16) |
    (data[18] << 8) |
    data[19]) >>> 0;
  const height =
    ((data[20] << 24) |
    (data[21] << 16) |
    (data[22] << 8) |
    data[23]) >>> 0;

  return {
    detectedFormat: "png" as const,
    height: height > 0 ? height : null,
    signatureValid: true,
    width: width > 0 ? width : null,
  };
}

function isJpegSofMarker(marker: number) {
  return marker === 0xc0 ||
    marker === 0xc1 ||
    marker === 0xc2 ||
    marker === 0xc3 ||
    marker === 0xc5 ||
    marker === 0xc6 ||
    marker === 0xc7 ||
    marker === 0xc9 ||
    marker === 0xca ||
    marker === 0xcb ||
    marker === 0xcd ||
    marker === 0xce ||
    marker === 0xcf;
}

function inspectJpegDimensions(data: Uint8Array) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return null;
  }

  let cursor = 2;
  while (cursor + 8 < data.length) {
    while (cursor < data.length && data[cursor] === 0xff) {
      cursor += 1;
    }

    if (cursor >= data.length) {
      break;
    }

    const marker = data[cursor];
    cursor += 1;

    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }

    if (cursor + 1 >= data.length) {
      break;
    }

    const segmentLength = (data[cursor] << 8) | data[cursor + 1];
    cursor += 2;

    if (segmentLength < 2 || cursor + segmentLength - 2 > data.length) {
      break;
    }

    if (isJpegSofMarker(marker) && segmentLength >= 7) {
      const height = (data[cursor + 1] << 8) | data[cursor + 2];
      const width = (data[cursor + 3] << 8) | data[cursor + 4];

      return {
        detectedFormat: "jpeg" as const,
        height: height > 0 ? height : null,
        signatureValid: true,
        width: width > 0 ? width : null,
      };
    }

    cursor += segmentLength - 2;
  }

  return {
    detectedFormat: "jpeg" as const,
    height: null,
    signatureValid: true,
    width: null,
  };
}

function inspectWebpDimensions(data: Uint8Array) {
  if (
    data.length < 30 ||
    asciiSlice(data, 0, 4) !== "RIFF" ||
    asciiSlice(data, 8, 4) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = asciiSlice(data, 12, 4);
  const chunkStart = 20;

  if (chunkType === "VP8X" && data.length >= 30) {
    const width = 1 + data[24] + (data[25] << 8) + (data[26] << 16);
    const height = 1 + data[27] + (data[28] << 8) + (data[29] << 16);

    return {
      detectedFormat: "webp" as const,
      height: height > 0 ? height : null,
      signatureValid: true,
      width: width > 0 ? width : null,
    };
  }

  if (chunkType === "VP8 " && data.length >= chunkStart + 10) {
    const hasFrameStartCode =
      data[chunkStart + 3] === 0x9d &&
      data[chunkStart + 4] === 0x01 &&
      data[chunkStart + 5] === 0x2a;

    if (hasFrameStartCode) {
      const width = ((data[chunkStart + 7] << 8) | data[chunkStart + 6]) & 0x3fff;
      const height = ((data[chunkStart + 9] << 8) | data[chunkStart + 8]) & 0x3fff;

      return {
        detectedFormat: "webp" as const,
        height: height > 0 ? height : null,
        signatureValid: true,
        width: width > 0 ? width : null,
      };
    }
  }

  if (chunkType === "VP8L" && data.length >= chunkStart + 5 && data[chunkStart] === 0x2f) {
    const b0 = data[chunkStart + 1];
    const b1 = data[chunkStart + 2];
    const b2 = data[chunkStart + 3];
    const b3 = data[chunkStart + 4];

    const width = 1 + (b0 | ((b1 & 0x3f) << 8));
    const height = 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10));

    return {
      detectedFormat: "webp" as const,
      height: height > 0 ? height : null,
      signatureValid: true,
      width: width > 0 ? width : null,
    };
  }

  return {
    detectedFormat: "webp" as const,
    height: null,
    signatureValid: true,
    width: null,
  };
}

export function inspectUploadedImage(fileBytes: ArrayBuffer): ImageInspection {
  const data = new Uint8Array(fileBytes);

  const pngInspection = inspectPngDimensions(data);
  const jpegInspection = inspectJpegDimensions(data);
  const webpInspection = inspectWebpDimensions(data);

  const rawInspection = pngInspection ?? jpegInspection ?? webpInspection ?? {
    detectedFormat: "unknown" as const,
    height: null,
    signatureValid: false,
    width: null,
  };

  const megapixels =
    rawInspection.width && rawInspection.height
      ? (rawInspection.width * rawInspection.height) / 1_000_000
      : null;
  const aspectRatio =
    rawInspection.width && rawInspection.height
      ? rawInspection.width / rawInspection.height
      : null;

  return {
    ...rawInspection,
    aspectRatio,
    megapixels,
  };
}

export function evaluateVerification(
  input: VerificationEvaluationInput,
): VerificationEvaluationResult {
  const joinedText = normalizeText(
    `${input.fileName} ${input.email ?? ""} ${input.fullName ?? ""}`,
  );

  const minQualityBytes = 32 * 1024;
  const qualityPass = input.fileSize >= minQualityBytes;
  const declaredRegId = normalizeRegId(input.declaredRegId);
  const inferredRegId = findRegIdCandidate(joinedText);
  const regIdCandidate = declaredRegId ?? inferredRegId;
  const regIdSource = declaredRegId ? "declared" : (inferredRegId ? "inferred" : "none");
  const regRegexMatch = matchesAnyRegex(
    regIdCandidate,
    input.university.reg_id_regex,
  );
  const keywordMatch = hasUniversityKeyword(joinedText, input.university);
  const nameToken = firstToken(input.fullName);
  const nameSignal = nameToken.length > 2 && joinedText.includes(nameToken);
  const domainSignal = hasDomainSignal(input.email, input.university.domain);
  const extensionSignal = hasImageExtension(input.fileName);

  const hasDimensions = Boolean(input.imageInspection.width && input.imageInspection.height);
  const dimensionPass = hasDimensions &&
    Boolean(
      input.imageInspection.width &&
      input.imageInspection.height &&
      input.imageInspection.width >= 520 &&
      input.imageInspection.height >= 280,
    );
  const aspectRatioPass =
    input.imageInspection.aspectRatio !== null &&
    input.imageInspection.aspectRatio >= 0.55 &&
    input.imageInspection.aspectRatio <= 2.4;
  const megapixelPass =
    input.imageInspection.megapixels !== null &&
    input.imageInspection.megapixels >= 0.25 &&
    input.imageInspection.megapixels <= 20;
  const strongResolutionSignal = hasDimensions &&
    Boolean(
      input.imageInspection.width &&
      input.imageInspection.height &&
      input.imageInspection.width >= 900 &&
      input.imageInspection.height >= 550,
    );

  const imageQualityPass =
    input.imageInspection.signatureValid &&
    dimensionPass &&
    aspectRatioPass &&
    megapixelPass;

  let score = 0;
  if (regIdCandidate) {
    score += 30;
  }
  if (regRegexMatch) {
    score += 25;
  }
  if (domainSignal) {
    score += 15;
  }
  if (keywordMatch) {
    score += 5;
  }
  if (nameSignal) {
    score += 5;
  }
  if (extensionSignal) {
    score += 3;
  }
  if (input.imageInspection.signatureValid) {
    score += 10;
  }
  if (dimensionPass) {
    score += 7;
  }
  if (aspectRatioPass) {
    score += 5;
  }
  if (megapixelPass) {
    score += 5;
  }
  if (strongResolutionSignal) {
    score += 5;
  }
  if (qualityPass) {
    score += 5;
  }
  if (input.imageInspection.detectedFormat !== "unknown") {
    score += 3;
  }

  score = Math.min(score, 100);

  if (!qualityPass || !imageQualityPass) {
    score = Math.min(score, 45);
  }

  const approvalThreshold = Math.max(input.university.min_score, 72);
  const manualReviewThreshold = Math.max(approvalThreshold - 20, 55);

  let decision: VerificationEvaluationResult["decision"] = "rejected";
  const autoApproveEligible =
    qualityPass &&
    imageQualityPass &&
    regRegexMatch &&
    domainSignal &&
    strongResolutionSignal &&
    score >= approvalThreshold;

  if (input.allowAutoApprove === true && autoApproveEligible) {
    decision = "approved";
  } else if (qualityPass && imageQualityPass && score >= manualReviewThreshold) {
    decision = "pending";
  }

  const needsManualReview = decision === "pending";

  return {
    decision,
    reasons: {
      approval_threshold: approvalThreshold,
      aspect_ratio: input.imageInspection.aspectRatio,
      aspect_ratio_pass: aspectRatioPass,
      auto_approve_eligible: autoApproveEligible,
      auto_approve_enabled: input.allowAutoApprove === true,
      declared_reg_id_present: Boolean(declaredRegId),
      detected_format: input.imageInspection.detectedFormat,
      dimension_pass: dimensionPass,
      domain_signal: domainSignal,
      extension_signal: extensionSignal,
      image_signature_valid: input.imageInspection.signatureValid,
      keyword_match: keywordMatch,
      manual_review_threshold: manualReviewThreshold,
      megapixel_pass: megapixelPass,
      megapixels: input.imageInspection.megapixels,
      min_quality_bytes: minQualityBytes,
      needs_manual_review: needsManualReview,
      name_signal: nameSignal,
      quality_pass: qualityPass,
      quality_bytes: input.fileSize,
      reg_id_candidate_found: Boolean(regIdCandidate),
      reg_id_source: regIdSource,
      reg_id_regex_match: regRegexMatch,
      strong_resolution_signal: strongResolutionSignal,
      width: input.imageInspection.width,
      height: input.imageInspection.height,
    },
    regIdCandidate,
    score,
  };
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function regIdLast4(regId: string | null) {
  if (!regId) {
    return null;
  }

  return regId.slice(-4);
}

export function buildIdFrontPath(userId: string, fileName: string) {
  const cleanedName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${userId}/${Date.now()}-${randomUUID()}-${cleanedName || "id-front"}`;
}
