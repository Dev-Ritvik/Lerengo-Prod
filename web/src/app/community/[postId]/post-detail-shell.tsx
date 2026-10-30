"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";
import { LogoutButton } from "@/components/logout-button";
import type { CommunityComment, CommunityDiscussion, MatchCard } from "../data";
import styles from "./page.module.css";

type CommunityPostDetailShellProps = {
  avatarUrl?: string | null;
  universityName: string;
  displayName: string;
  initials: string;
  showAdminLink?: boolean;
  adminUrl?: string;
  isSuperadmin?: boolean;
  post: CommunityDiscussion & { topic: string | null };
  comments: CommunityComment[];
  relatedPartnerRequests: MatchCard[];
};

function CommentNode({
  comment,
  helpfulSubmittingId,
  onHelpful,
  onReply,
  onStartReply,
  replyDraft,
  setReplyDraft,
  replyTargetId,
  isSubmitting,
  isSuperadmin = false,
  onDeleteComment,
}: {
  comment: CommunityComment;
  helpfulSubmittingId: string | null;
  onHelpful: (commentId: string) => Promise<void>;
  onReply: (parentId: string) => Promise<void>;
  onStartReply: (commentId: string, author: string) => void;
  replyDraft: string;
  setReplyDraft: (value: string) => void;
  replyTargetId: string | null;
  isSubmitting: boolean;
  isSuperadmin?: boolean;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const isReplying = replyTargetId === comment.id;

  return (
    <article className={styles.commentCard}>
      <div className={styles.commentHeader}>
        <div className={styles.avatarMedium}>{comment.authorInitials}</div>
        <div className={styles.commentMeta}>
          <div className={styles.commentTopRow}>
            <strong className={styles.commentAuthor}>{comment.author}</strong>
            <span className={styles.timeLabel}>{comment.timeLabel}</span>
          </div>
          <div className={styles.commentSubRow}>
            <span className={styles.inlineMeta}>{comment.role}</span>
            <span className={styles.metricPill}>{comment.helpfulCount} helpful</span>
          </div>
        </div>
      </div>

      <p className={styles.commentBody}>{comment.body}</p>

      <div className={styles.commentActions}>
        <button
          className={styles.textActionButton}
          onClick={() => onStartReply(comment.id, comment.author)}
          type="button"
        >
          {isReplying ? "Editing reply" : "Reply"}
        </button>
        <button
          className={`${styles.textActionButton} ${comment.viewerHasVoted ? styles.textActionButtonActive : ""}`}
          disabled={helpfulSubmittingId === comment.id}
          onClick={() => void onHelpful(comment.id)}
          type="button"
        >
          {helpfulSubmittingId === comment.id
            ? "Updating..."
            : `${comment.viewerHasVoted ? "Helpful saved" : "Mark helpful"} · ${comment.helpfulCount}`}
        </button>
        {isSuperadmin && onDeleteComment ? (
          <button
            className={styles.textActionButton}
            style={{ color: "#f19393" }}
            onClick={() => void onDeleteComment(comment.id)}
            type="button"
          >
            Delete
          </button>
        ) : null}
      </div>

      {isReplying ? (
        <div className={styles.replyComposer}>
          <textarea onChange={(event) => setReplyDraft(event.target.value)} placeholder="Add a precise, useful reply." rows={3} value={replyDraft} />
          <div className={styles.replyComposerActions}>
            <button className={styles.secondaryButton} onClick={() => setReplyDraft("")} type="button">Clear</button>
            <button className={styles.actionButton} disabled={isSubmitting} onClick={() => void onReply(comment.id)} type="button">
              {isSubmitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className={styles.commentReplies}>
          {comment.replies.map((reply) => (
            <CommentNode
              comment={reply}
              helpfulSubmittingId={helpfulSubmittingId}
              onHelpful={onHelpful}
              isSubmitting={isSubmitting}
              key={reply.id}
              onReply={onReply}
              onStartReply={onStartReply}
              replyDraft={replyDraft}
              replyTargetId={replyTargetId}
              setReplyDraft={setReplyDraft}
              isSuperadmin={isSuperadmin}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CommunityPostDetailShell({
  avatarUrl = null,
  universityName,
  displayName,
  initials,
  showAdminLink = false,
  adminUrl = "/admin",
  isSuperadmin = false,
  post,
  comments,
  relatedPartnerRequests,
}: CommunityPostDetailShellProps) {
  const router = useRouter();
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [message, setMessage] = useState("Keep replies academic, direct, and useful.");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpfulSubmittingId, setHelpfulSubmittingId] = useState<string | null>(null);

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this discussion thread? This action cannot be undone.")) {
      return;
    }
    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("community_discussions").delete().eq("id", post.id);
      if (error) {
        alert("Failed to delete post: " + error.message);
      } else {
        alert("Discussion thread deleted successfully.");
        router.push("/community");
      }
    } catch (err: any) {
      alert("Error deleting post: " + err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this reply? This action cannot be undone.")) {
      return;
    }
    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
      if (error) {
        alert("Failed to delete reply: " + error.message);
      } else {
        alert("Reply deleted successfully.");
        router.refresh();
      }
    } catch (err: any) {
      alert("Error deleting reply: " + err.message);
    }
  };

  async function submitComment(body: string, parentId: string | null) {
    setIsSubmitting(true);
    setStatus("idle");
    setMessage("Posting reply...");

    try {
      const response = await fetch("/api/community/comments", {
        body: JSON.stringify({ body, parentId, postId: post.id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setStatus("error");
        setMessage(result.error ?? "Could not post the reply. Try again.");
        return;
      }

      setCommentDraft("");
      setReplyDraft("");
      setReplyTargetId(null);
      setStatus("success");
      setMessage("Reply posted.");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Could not post the reply. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRootSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitComment(commentDraft, null);
  }

  async function handleReply(parentId: string) {
    await submitComment(replyDraft, parentId);
  }

  function handleStartReply(commentId: string, author: string) {
    if (replyTargetId === commentId) {
      setReplyTargetId(null);
      setReplyDraft("");
      return;
    }

    setReplyTargetId(commentId);
    setReplyDraft(`@${author} `);
  }

  async function handleHelpful(targetId: string, targetType: "post" | "comment") {
    setHelpfulSubmittingId(targetId);

    try {
      const response = await fetch("/api/community/helpful", {
        body: JSON.stringify({ targetId, targetType }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      router.refresh();
    } finally {
      setHelpfulSubmittingId(null);
    }
  }

  return (
    <main className={styles.shell} data-workspace-shell="true">
      <aside className={styles.sidebar}>
        <div className={styles.sidebarMain}>
          <div className={styles.sidebarBrand}>
            <Link aria-label="LerenGO home" className={styles.sidebarLogoLink} href="/">
              <Image alt="LerenGO logo" className={styles.sidebarLogo} height={303} priority src="/logo.lerengo.embedded.svg" width={562} />
            </Link>
          </div>
          <div aria-hidden="true" className={styles.sidebarDivider} />
          <nav aria-label="Workspace navigation" className={styles.sidebarNav}>
            <Link className={styles.sidebarItem} href="/browse-notes">
              <Image alt="" className={styles.sidebarIcon} height={30} src="/notes.png" width={30} />
              <span className={styles.sidebarItemLabel}>Notes</span>
            </Link>
            <Link className={styles.sidebarItem} href="/mentorship">
              <Image alt="" className={styles.sidebarIcon} height={30} src="/mentorship.png" width={30} />
              <span className={styles.sidebarItemLabel}>Mentorship</span>
            </Link>
            <Link className={`${styles.sidebarItem} ${styles.sidebarItemActive}`} href="/community">
              <Image alt="" className={styles.sidebarIcon} height={30} src="/community.png" width={30} />
              <span className={styles.sidebarItemLabel}>Campus Community</span>
            </Link>
          </nav>
        </div>
        <div className={styles.sidebarBottom}>
          <div aria-hidden="true" className={styles.sidebarDivider} />
          <LogoutButton className={styles.sidebarLogout}>
            <Image alt="" className={styles.sidebarIcon} height={28} src="/logout.png" width={28} />
            Log out
          </LogoutButton>
        </div>
      </aside>

      <section className={styles.mainPanel}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div className={styles.scopeField}>
              <Image alt="" aria-hidden="true" className={styles.universityLogo} height={30} src="/lpu logo.png" width={30} />
              <span className={styles.universityName}>{universityName}</span>
            </div>
            <div className={styles.searchField}>
              <span className={styles.searchCopy}>Discussion Thread</span>
            </div>
          </div>
          <div className={styles.profileDock}>
            <ProfileMenu
              avatarUrl={avatarUrl}
              displayName={displayName}
              initials={initials}
              showAdminLink={showAdminLink}
              adminUrl={adminUrl}
            />
          </div>
        </header>

        <div className={styles.contentPane}>
          <div className={styles.sectionHeaderRow}>
            <div>
              <p className={styles.eyebrow}>LerenGO &gt; Campus Community</p>
              <h1 className={styles.pageTitle}>{post.title}</h1>
              <p className={styles.pageDescription}>{post.summary}</p>
            </div>
            <div className={styles.headerActions} style={{ display: "flex", gap: "8px" }}>
              <Link className={styles.secondaryButton} href="/community">Back to Community</Link>
              {isSuperadmin ? (
                <button
                  className={styles.secondaryButton}
                  style={{ borderColor: "#f19393", color: "#f19393" }}
                  onClick={handleDeletePost}
                  type="button"
                >
                  Delete Post
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.workspaceGrid}>
            <section className={styles.primaryColumn}>
              <div className={styles.metaAndTagsPanel}>
                <div className={styles.postMetaRow}>
                  <span className={styles.metricPill}>{post.channel}</span>
                  {post.topic ? <span className={styles.metricPill}>{post.topic}</span> : null}
                  <span className={styles.metricPill}>{post.replies} replies</span>
                  <button
                    className={`${styles.textActionButton} ${post.viewerHasVoted ? styles.textActionButtonActive : ""}`}
                    disabled={helpfulSubmittingId === post.id}
                    onClick={() => void handleHelpful(post.id, "post")}
                    type="button"
                  >
                    {helpfulSubmittingId === post.id
                      ? "Updating..."
                      : `${post.viewerHasVoted ? "Helpful saved" : "Mark helpful"} · ${post.helpfulCount}`}
                  </button>
                  <span className={styles.metricPill}>Trust {post.trustScore}</span>
                  <span className={styles.metricPill}>{post.status}</span>
                </div>
                <div className={styles.tagRow}>
                  <span className={styles.tagPill}>{post.badge}</span>
                  {post.tags.map((tag) => (
                    <span className={styles.tagPill} key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>Replies</h2>
                </div>

                <form className={styles.replyComposer} onSubmit={handleRootSubmit}>
                  <textarea onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add your reply to the thread." rows={4} value={commentDraft} />
                  <div className={styles.replyComposerActions}>
                    <p className={`${styles.formMessage} ${status === "success" ? styles.formMessageSuccess : status === "error" ? styles.formMessageError : ""}`}>{message}</p>
                    <button className={styles.actionButton} disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Posting..." : "Post Reply"}
                    </button>
                  </div>
                </form>

                {comments.length === 0 ? (
                  <div className={styles.emptyStateCard}>
                    <h2>No replies yet</h2>
                    <p>
                      Be the first to add a precise, useful response and move this
                      discussion forward for the campus.
                    </p>
                  </div>
                ) : (
                  <div className={styles.commentsList}>
                    {comments.map((comment) => (
                      <div key={comment.id}>
                        <CommentNode
                          comment={comment}
                          helpfulSubmittingId={helpfulSubmittingId}
                          onHelpful={(commentId) => handleHelpful(commentId, "comment")}
                          isSubmitting={isSubmitting}
                          onReply={handleReply}
                          onStartReply={handleStartReply}
                          replyDraft={replyDraft}
                          replyTargetId={replyTargetId}
                          setReplyDraft={setReplyDraft}
                          isSuperadmin={isSuperadmin}
                          onDeleteComment={handleDeleteComment}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </section>

            <aside className={styles.sideRail}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>Partner Requests</h2>
                </div>
                {relatedPartnerRequests.length === 0 ? (
                  <div className={styles.emptyStateCard}>
                    <h2>No related partner requests</h2>
                    <p>
                      When collaboration demand grows around this topic, relevant
                      project partner requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className={styles.partnerGrid}>
                    {relatedPartnerRequests.map((card) => (
                      <article className={styles.utilityCard} key={card.id}>
                        <h3 className={styles.cardTitle}>{card.title}</h3>
                        <p className={styles.cardDescription}>{card.description}</p>
                        <div className={styles.tagRow}>
                          {card.skills.map((skill) => (
                            <span className={styles.tagPill} key={skill}>{skill}</span>
                          ))}
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metricPill}>{card.openRoles}</span>
                          <span className={styles.metricPill}>{card.teamSize}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
