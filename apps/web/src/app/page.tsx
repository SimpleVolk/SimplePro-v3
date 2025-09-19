'use client';

import { useState } from 'react';
import { EstimateForm } from './components/EstimateForm';
import { EstimateResult } from './components/EstimateResult';
import styles from './page.module.css';

export default function Index() {
  const [estimateResult, setEstimateResult] = useState(null);

  return (
    <div className={styles.page}>
      <div className="wrapper">
        <div className="container">
          <header className={styles.header}>
            <h1>SimplePro Moving Estimates</h1>
            <p>Get accurate, deterministic pricing for your move</p>
          </header>

          <main className={styles.main}>
            <div className={styles.formSection}>
              <EstimateForm onEstimateComplete={setEstimateResult} />
            </div>

            {estimateResult && (
              <div className={styles.resultSection}>
                <EstimateResult result={estimateResult} />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}