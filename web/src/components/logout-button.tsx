import styles from "./logout-button.module.css";

/**
 * L1 fix: logout is a POST form, not a GET link. A plain `<a href="/auth/logout">`
 * can be triggered cross-site (e.g. `<img src="https://app/auth/logout">` on any
 * malicious page), logging users out without consent. This server-rendered form
 * submits POST /auth/logout, which the route handler treats as the primary verb.
 *
 * `className` lets each surface keep its existing styling hook (menu item vs.
 * sidebar link); the inner span inherits text styling from the button reset.
 */
export function LogoutButton({
  className,
  children = "Log out",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form method="post" action="/auth/logout" className={styles.form}>
      <button type="submit" className={className ?? styles.default} role="menuitem">
        {children}
      </button>
    </form>
  );
}
