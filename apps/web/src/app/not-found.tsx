import Link from 'next/link';
import styles from './page.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1>404 - Page Not Found</h1>
        <p>Sorry, the page you are looking for does not exist.</p>
        <Link href="/" className={styles.button}>
          Return Home
        </Link>
      </main>
    </div>
  );
}