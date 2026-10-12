import { SiteShell } from "@/components/layout/SiteShell";
import ChatInbox from "./ChatInbox";
import styles from "./page.module.css";

export default function ChatPage() {
  return (
    <SiteShell>
      <main className={styles.page}>
        <header className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>PETMORCHOR MESSAGES</span>
            <h1>แชทของคุณ</h1>
            <p>พูดคุยและนัดหมายกับคนรักสัตว์ในชุมชน</p>
          </div>
          <span className={styles.headingIcon} aria-hidden="true">
            🐾
          </span>
        </header>
        <ChatInbox />
      </main>
    </SiteShell>
  );
}
