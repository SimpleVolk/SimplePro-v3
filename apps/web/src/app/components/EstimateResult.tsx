'use client';

import type { EstimateResult } from '@simplepro/pricing-engine';
import styles from './EstimateResult.module.css';

interface EstimateResultProps {
  result: EstimateResult;
}

export function EstimateResult({ result }: EstimateResultProps) {
  return (
    <div className={styles.container}>
      <h2>Your Moving Estimate</h2>

      <div className={styles.summary}>
        <div className={styles.totalPrice}>
          <span className={styles.label}>Total Price:</span>
          <span className={styles.price}>${result.calculations.finalPrice.toFixed(2)}</span>
        </div>
        <div className={styles.hash}>
          <span className={styles.label}>Calculation ID:</span>
          <span className={styles.hashValue}>{result.metadata.hash.substring(0, 12)}...</span>
        </div>
      </div>

      <div className={styles.breakdown}>
        <h3>Price Breakdown</h3>
        <div className={styles.breakdownItem}>
          <span>Base Labor:</span>
          <span>${result.calculations.breakdown.baseLabor.toFixed(2)}</span>
        </div>

        {result.calculations.breakdown.materials > 0 && (
          <div className={styles.breakdownItem}>
            <span>Materials:</span>
            <span>${result.calculations.breakdown.materials.toFixed(2)}</span>
          </div>
        )}

        {result.calculations.breakdown.transportation > 0 && (
          <div className={styles.breakdownItem}>
            <span>Transportation:</span>
            <span>${result.calculations.breakdown.transportation.toFixed(2)}</span>
          </div>
        )}

        {result.calculations.breakdown.locationHandicaps > 0 && (
          <div className={styles.breakdownItem}>
            <span>Location Handicaps:</span>
            <span>${result.calculations.breakdown.locationHandicaps.toFixed(2)}</span>
          </div>
        )}

        {result.calculations.breakdown.specialServices > 0 && (
          <div className={styles.breakdownItem}>
            <span>Special Services:</span>
            <span>${result.calculations.breakdown.specialServices.toFixed(2)}</span>
          </div>
        )}

        {result.calculations.breakdown.seasonalAdjustment !== 0 && (
          <div className={styles.breakdownItem}>
            <span>Seasonal Adjustment:</span>
            <span>${result.calculations.breakdown.seasonalAdjustment.toFixed(2)}</span>
          </div>
        )}

        <div className={styles.breakdownItem}>
          <span>Subtotal:</span>
          <span>${result.calculations.breakdown.subtotal.toFixed(2)}</span>
        </div>

        {result.calculations.breakdown.taxes > 0 && (
          <div className={styles.breakdownItem}>
            <span>Taxes:</span>
            <span>${result.calculations.breakdown.taxes.toFixed(2)}</span>
          </div>
        )}

        <div className={styles.breakdownItem} style={{ borderTop: '2px solid #4a9eff', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{ fontWeight: '600' }}>Total:</span>
          <span style={{ fontWeight: '600', color: '#48bb78' }}>${result.calculations.breakdown.total.toFixed(2)}</span>
        </div>
      </div>

      {result.calculations.appliedRules.length > 0 && (
        <div className={styles.appliedRules}>
          <h3>Applied Pricing Rules</h3>
          {result.calculations.appliedRules.map((rule, index) => (
            <div key={index} className={styles.rule}>
              <div className={styles.ruleName}>{rule.ruleName}</div>
              <div className={styles.ruleDescription}>{rule.description}</div>
              <div className={styles.ruleImpact}>
                {rule.priceImpact >= 0 ? '+' : ''}${rule.priceImpact.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {result.calculations.locationHandicaps.length > 0 && (
        <div className={styles.locationHandicaps}>
          <h3>Location Adjustments</h3>
          {result.calculations.locationHandicaps.map((handicap, index) => (
            <div key={index} className={styles.handicap}>
              <div className={styles.handicapName}>{handicap.name}</div>
              <div className={styles.handicapDescription}>{handicap.description}</div>
              <div className={styles.handicapImpact}>
                {handicap.priceImpact >= 0 ? '+' : ''}${handicap.priceImpact.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.metadata}>
        <h3>Calculation Details</h3>
        <div className={styles.metadataItem}>
          <span>Calculated by:</span>
          <span>{result.metadata.calculatedBy}</span>
        </div>
        <div className={styles.metadataItem}>
          <span>Calculation time:</span>
          <span>{result.metadata.calculatedAt.toLocaleString()}</span>
        </div>
        <div className={styles.metadataItem}>
          <span>Engine version:</span>
          <span>{result.metadata.rulesVersion}</span>
        </div>
        <div className={styles.metadataItem}>
          <span>Deterministic hash:</span>
          <span className={styles.fullHash}>{result.metadata.hash}</span>
        </div>
      </div>

      <div className={styles.disclaimer}>
        <h4>Important Notes</h4>
        <ul>
          <li>This estimate is binding when all details are accurate</li>
          <li>Final price may vary if actual inventory differs significantly</li>
          <li>Additional charges may apply for unforeseen circumstances</li>
          <li>This calculation is deterministic - same inputs will always produce the same result</li>
        </ul>
      </div>
    </div>
  );
}