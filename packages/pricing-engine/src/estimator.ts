// Browser-compatible UUID generation
function generateUUID(): string {
  // Try to use crypto.randomUUID if available (Node.js 15+ or modern browsers)
  try {
    const crypto = require('crypto');
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // crypto module not available in browser
  }

  // Fallback to crypto.getRandomValues for browsers
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (window.crypto.getRandomValues(new Uint8Array(1))[0] & 15) | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Final fallback using Math.random (less secure but works everywhere)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import {
  EstimateInput,
  EstimateResult,
  PricingRule,
  LocationHandicap,
  AppliedRule,
  AppliedLocationHandicap,
  RuleCondition,
  PriceBreakdown
} from './schemas/rules.schema';

export class DeterministicEstimator {
  private rules: PricingRule[] = [];
  private locationHandicaps: LocationHandicap[] = [];
  private readonly VERSION = '1.0.0';

  constructor(rules: PricingRule[], locationHandicaps: LocationHandicap[]) {
    this.rules = rules.sort((a, b) => a.priority - b.priority);
    this.locationHandicaps = locationHandicaps.filter(h => h.isActive);
  }

  /**
   * Calculate a deterministic estimate based on input parameters
   * The same input will always produce the same output
   */
  public calculateEstimate(input: EstimateInput, calculatedBy: string): EstimateResult {
    // Create deterministic hash of input for reproducibility
    const inputHash = this.createDeterministicHash(input);

    // Start with base price calculation
    let basePrice = this.calculateBasePrice(input);
    let currentPrice = basePrice;

    // Apply pricing rules in priority order
    const appliedRules: AppliedRule[] = [];
    for (const rule of this.rules) {
      if (this.shouldApplyRule(rule, input)) {
        const ruleImpact = this.applyRule(rule, input, currentPrice);
        currentPrice += ruleImpact;

        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          description: rule.description,
          conditionsMet: true,
          priceImpact: ruleImpact,
          calculationDetails: this.getRuleCalculationDetails(rule, input, ruleImpact)
        });
      }
    }

    // Apply location handicaps
    const appliedHandicaps: AppliedLocationHandicap[] = [];
    for (const handicap of this.locationHandicaps) {
      if (this.shouldApplyLocationHandicap(handicap, input)) {
        const handicapImpact = this.applyLocationHandicap(handicap, input, currentPrice);
        currentPrice = handicapImpact.finalPrice;

        const appliedHandicap: AppliedLocationHandicap = {
          handicapId: handicap.id,
          name: handicap.name,
          description: handicap.description,
          type: this.getHandicapType(handicap, input),
          priceImpact: handicapImpact.impact
        };

        if (handicap.multiplier !== 1.0) {
          appliedHandicap.multiplier = handicap.multiplier;
        }

        if (handicap.fixedAmount) {
          appliedHandicap.fixedAmount = handicap.fixedAmount;
        }

        appliedHandicaps.push(appliedHandicap);
      }
    }

    // Create price breakdown
    const breakdown = this.createPriceBreakdown(input, basePrice, appliedRules, appliedHandicaps, currentPrice);

    return {
      estimateId: generateUUID(),
      input,
      calculations: {
        basePrice,
        appliedRules,
        locationHandicaps: appliedHandicaps,
        adjustments: [],
        finalPrice: currentPrice,
        breakdown
      },
      metadata: {
        calculatedAt: new Date(),
        calculatedBy,
        rulesVersion: this.VERSION,
        deterministic: true,
        hash: inputHash
      }
    };
  }

  /**
   * Create a deterministic SHA256 hash of the input parameters
   */
  private createDeterministicHash(input: EstimateInput): string {
    // Create a normalized representation of the input for hashing
    const normalizedInput = {
      service: input.service,
      moveDate: input.moveDate.toISOString().split('T')[0], // Date only, no time
      distance: Math.round(input.distance * 100) / 100, // Round to 2 decimal places
      totalWeight: Math.round(input.totalWeight),
      totalVolume: Math.round(input.totalVolume * 100) / 100,
      crewSize: input.crewSize,
      pickup: {
        floorLevel: input.pickup.floorLevel,
        elevatorAccess: input.pickup.elevatorAccess,
        longCarry: input.pickup.longCarry,
        parkingDistance: input.pickup.parkingDistance,
        accessDifficulty: input.pickup.accessDifficulty,
        stairsCount: input.pickup.stairsCount || 0,
        narrowHallways: input.pickup.narrowHallways || false
      },
      delivery: {
        floorLevel: input.delivery.floorLevel,
        elevatorAccess: input.delivery.elevatorAccess,
        longCarry: input.delivery.longCarry,
        parkingDistance: input.delivery.parkingDistance,
        accessDifficulty: input.delivery.accessDifficulty,
        stairsCount: input.delivery.stairsCount || 0,
        narrowHallways: input.delivery.narrowHallways || false
      },
      specialItems: input.specialItems,
      additionalServices: input.additionalServices,
      isWeekend: input.isWeekend,
      isHoliday: input.isHoliday,
      seasonalPeriod: input.seasonalPeriod,
      specialtyCrewRequired: input.specialtyCrewRequired,
      rulesVersion: this.VERSION
    };

    const inputString = JSON.stringify(normalizedInput, Object.keys(normalizedInput).sort());
    return crypto.createHash('sha256').update(inputString).digest('hex');
  }

  /**
   * Calculate base price before applying rules and handicaps
   */
  private calculateBasePrice(input: EstimateInput): number {
    switch (input.service) {
      case 'local':
        // Base rate is typically per hour, multiply by estimated duration and crew size
        const baseHourlyRate = 150; // $150 for 2-person crew
        const crewAdjustment = input.crewSize > 2 ? (input.crewSize - 2) * 75 : 0;
        return (baseHourlyRate + crewAdjustment) * input.estimatedDuration;

      case 'long_distance':
        // Base rate is per pound for long distance
        const basePerPoundRate = 1.25;
        return input.totalWeight * basePerPoundRate;

      case 'storage':
        // Base rate per cubic foot per month
        const storageRate = 8.0;
        return input.totalVolume * storageRate;

      case 'packing_only':
        // Hourly rate for packing services
        const packingRate = 85;
        return packingRate * input.estimatedDuration;

      default:
        throw new Error(`Unknown service type: ${input.service}`);
    }
  }

  /**
   * Check if a pricing rule should be applied based on its conditions
   */
  private shouldApplyRule(rule: PricingRule, input: EstimateInput): boolean {
    if (!rule.isActive) return false;

    // Check service applicability
    if (!rule.applicableServices.includes(input.service)) return false;

    // Check date range if specified
    if (rule.effectiveFrom && input.moveDate < rule.effectiveFrom) return false;
    if (rule.effectiveTo && input.moveDate > rule.effectiveTo) return false;

    // Check all conditions
    return this.evaluateConditions(rule.conditions, input);
  }

  /**
   * Evaluate rule conditions against input data
   */
  private evaluateConditions(conditions: RuleCondition[], input: EstimateInput): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogicalOperator: 'and' | 'or' = 'and';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, input);

      if (currentLogicalOperator === 'and') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      // Set logical operator for next condition
      if (condition.logicalOperator) {
        currentLogicalOperator = condition.logicalOperator;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, input: EstimateInput): boolean {
    const fieldValue = this.getFieldValue(condition.field, input);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'gte':
        return Number(fieldValue) >= Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      case 'lte':
        return Number(fieldValue) <= Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'between':
        return Array.isArray(condition.value) &&
               condition.value.length === 2 &&
               Number(fieldValue) >= Number(condition.value[0]) &&
               Number(fieldValue) <= Number(condition.value[1]);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Get field value from input using dot notation
   */
  private getFieldValue(fieldPath: string, input: EstimateInput): any {
    return fieldPath.split('.').reduce((obj: any, key: string) => obj?.[key], input);
  }

  /**
   * Apply a pricing rule and return the price impact
   */
  private applyRule(rule: PricingRule, input: EstimateInput, currentPrice: number): number {
    let totalImpact = 0;

    for (const action of rule.actions) {
      switch (action.type) {
        case 'add_fixed':
          // For crew size adjustments, multiply by extra crew members
          if (rule.id === 'crew_size_adjustment') {
            const extraCrew = Math.max(0, input.crewSize - 2);
            totalImpact += action.amount * extraCrew * input.estimatedDuration;
          }
          // For fragile items, multiply by quantity over threshold
          else if (rule.id === 'fragile_items_surcharge') {
            const extraFragile = Math.max(0, input.specialItems.fragileItems - 5);
            totalImpact += action.amount * extraFragile;
          } else {
            totalImpact += action.amount;
          }
          break;

        case 'add_percentage':
          totalImpact += currentPrice * action.amount;
          break;

        case 'multiply':
          if (action.targetField === 'totalWeight') {
            totalImpact += input.totalWeight * action.amount;
          } else {
            totalImpact += currentPrice * (action.amount - 1);
          }
          break;

        case 'set_minimum':
          const difference = action.amount - currentPrice;
          totalImpact += Math.max(0, difference);
          break;

        case 'set_maximum':
          const excess = currentPrice - action.amount;
          totalImpact -= Math.max(0, excess);
          break;

        case 'replace':
          totalImpact = action.amount - currentPrice;
          break;
      }
    }

    return Math.round(totalImpact * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if location handicap should be applied
   */
  private shouldApplyLocationHandicap(handicap: LocationHandicap, input: EstimateInput): boolean {
    if (!handicap.isActive) return false;
    return this.evaluateConditions(handicap.conditions, input);
  }

  /**
   * Apply location handicap and return impact details
   */
  private applyLocationHandicap(handicap: LocationHandicap, input: EstimateInput, currentPrice: number): { impact: number; finalPrice: number } {
    let impact = 0;
    let finalPrice = currentPrice;

    if (handicap.fixedAmount && handicap.fixedAmount > 0) {
      // For stairs, multiply by number of flights
      if (handicap.id.includes('stairs')) {
        const stairsCount = handicap.id.includes('pickup') ?
          (input.pickup.stairsCount || 1) :
          (input.delivery.stairsCount || 1);
        impact = handicap.fixedAmount * stairsCount;
      } else {
        impact = handicap.fixedAmount;
      }
      finalPrice += impact;
    }

    if (handicap.multiplier && handicap.multiplier !== 1.0) {
      const multiplierImpact = currentPrice * (handicap.multiplier - 1);
      impact += multiplierImpact;
      finalPrice = currentPrice * handicap.multiplier + (finalPrice - currentPrice);
    }

    return {
      impact: Math.round(impact * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100
    };
  }

  /**
   * Determine handicap type based on conditions
   */
  private getHandicapType(handicap: LocationHandicap, _input: EstimateInput): 'pickup' | 'delivery' | 'both' {
    const hasPickupConditions = handicap.conditions.some(c => c.field.startsWith('pickup'));
    const hasDeliveryConditions = handicap.conditions.some(c => c.field.startsWith('delivery'));

    if (hasPickupConditions && hasDeliveryConditions) return 'both';
    if (hasPickupConditions) return 'pickup';
    if (hasDeliveryConditions) return 'delivery';
    return 'both';
  }

  /**
   * Get detailed calculation description for a rule
   */
  private getRuleCalculationDetails(rule: PricingRule, input: EstimateInput, impact: number): string {
    switch (rule.id) {
      case 'crew_size_adjustment':
        const extraCrew = Math.max(0, input.crewSize - 2);
        return `${extraCrew} extra crew × $75/hour × ${input.estimatedDuration} hours = $${impact}`;

      case 'fragile_items_surcharge':
        const extraFragile = Math.max(0, input.specialItems.fragileItems - 5);
        return `${extraFragile} fragile items over 5 × $25 = $${impact}`;

      case 'weight_heavy_surcharge':
        return `15% surcharge on shipments over 8,000 lbs (${input.totalWeight} lbs)`;

      case 'weekend_surcharge':
        return `10% weekend surcharge applied`;

      case 'peak_season_surcharge':
        return `15% peak season surcharge (${input.seasonalPeriod})`;

      default:
        return `Applied ${rule.name}: $${impact}`;
    }
  }

  /**
   * Create detailed price breakdown
   */
  private createPriceBreakdown(
    _input: EstimateInput,
    basePrice: number,
    appliedRules: AppliedRule[],
    appliedHandicaps: AppliedLocationHandicap[],
    finalPrice: number
  ): PriceBreakdown {
    const baseLabor = basePrice;

    // Calculate materials (packing supplies, etc.)
    const materials = appliedRules
      .filter(r => r.ruleId === 'packing_service_rate' || r.ruleId === 'assembly_service')
      .reduce((sum, r) => sum + r.priceImpact, 0);

    // Calculate transportation (distance-based charges)
    const transportation = appliedRules
      .filter(r => r.ruleId.includes('distance'))
      .reduce((sum, r) => sum + r.priceImpact, 0);

    // Calculate location handicaps
    const locationHandicaps = appliedHandicaps
      .reduce((sum, h) => sum + h.priceImpact, 0);

    // Calculate special services (piano, antiques, etc.)
    const specialServices = appliedRules
      .filter(r => r.ruleId.includes('piano') || r.ruleId.includes('antique') || r.ruleId.includes('fragile'))
      .reduce((sum, r) => sum + r.priceImpact, 0);

    // Calculate seasonal adjustments
    const seasonalAdjustment = appliedRules
      .filter(r => r.ruleId.includes('weekend') || r.ruleId.includes('season'))
      .reduce((sum, r) => sum + r.priceImpact, 0);

    const subtotal = baseLabor + materials + transportation + locationHandicaps + specialServices + seasonalAdjustment;
    const taxes = 0; // Typically calculated separately based on location
    const total = finalPrice;

    return {
      baseLabor: Math.round(baseLabor * 100) / 100,
      materials: Math.round(materials * 100) / 100,
      transportation: Math.round(transportation * 100) / 100,
      locationHandicaps: Math.round(locationHandicaps * 100) / 100,
      specialServices: Math.round(specialServices * 100) / 100,
      seasonalAdjustment: Math.round(seasonalAdjustment * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Validate estimate input for completeness and accuracy
   */
  public validateInput(input: EstimateInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!input.customerId) errors.push('Customer ID is required');
    if (!input.moveDate) errors.push('Move date is required');
    if (!input.service) errors.push('Service type is required');

    // Numeric validations
    if (input.totalWeight <= 0) errors.push('Total weight must be greater than 0');
    if (input.totalVolume <= 0) errors.push('Total volume must be greater than 0');
    if (input.distance < 0) errors.push('Distance cannot be negative');
    if (input.crewSize < 1) errors.push('Crew size must be at least 1');
    if (input.estimatedDuration <= 0) errors.push('Estimated duration must be greater than 0');

    // Address validations
    if (!input.pickup.address) errors.push('Pickup address is required');
    if (!input.delivery.address) errors.push('Delivery address is required');

    // Date validations
    if (input.moveDate < new Date()) errors.push('Move date cannot be in the past');

    // Logical validations
    if (input.service === 'long_distance' && input.distance <= 50) {
      errors.push('Long distance moves must be over 50 miles');
    }
    if (input.service === 'local' && input.distance > 50) {
      errors.push('Local moves must be 50 miles or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}