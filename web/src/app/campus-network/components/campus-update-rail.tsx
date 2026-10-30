import { TransitionLink } from "@/components/transition-link";
import type { CampusUpdateBanner } from "../analytics";
import styles from "../page.module.css";

type Props = {
  items: CampusUpdateBanner[];
};

function BannerCard({
  item,
  isClone = false,
}: {
  item: CampusUpdateBanner;
  isClone?: boolean;
}) {
  const cardClassName = `${styles.bannerCard} ${styles[`bannerCard${item.kind}`]}`;

  const content = (
    <>
      <div className={styles.bannerCardTop}>
        <span className={styles.bannerEyebrow}>{item.eyebrow}</span>
        <span className={styles.bannerPill}>{item.pill}</span>
      </div>

      <div className={styles.bannerCardBody}>
        <h3 className={styles.bannerHeadline}>{item.headline}</h3>
        <p className={styles.bannerBody}>{item.body}</p>
      </div>

      <footer className={styles.bannerCardFooter}>
        <span className={styles.bannerMeta}>{item.meta}</span>
        <span className={styles.bannerAction}>{item.ctaLabel}</span>
      </footer>
    </>
  );

  if (isClone) {
    return (
      <div aria-hidden="true" className={cardClassName}>
        {content}
      </div>
    );
  }

  return (
    <TransitionLink className={cardClassName} href={item.ctaHref}>
      {content}
    </TransitionLink>
  );
}

export function CampusUpdateRail({ items }: Props) {
  const trackItems = [...items, ...items];

  return (
    <div className={styles.bannerRailWrap}>
      <div className={styles.bannerRailHeader}>
        <div>
          <p className={styles.bannerSectionEyebrow}>Campus News and Events</p>
          <h3 className={styles.bannerSectionTitle}>
            Live campus wins, event banners, and bulletin updates
          </h3>
        </div>

        <p className={styles.bannerSectionHint}>Auto-scrolls. Hover to pause.</p>
      </div>

      <div className={styles.bannerViewport}>
        <div className={styles.bannerTrack}>
          {trackItems.map((item, index) => (
            <BannerCard
              item={item}
              isClone={index >= items.length}
              key={`${item.id}-${index >= items.length ? "clone" : "live"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
