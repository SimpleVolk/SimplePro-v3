// Robust cross-platform UUID generation with error handling and validation
function generateUUID(): string {
  let uuid: string;

  try {
    // Node.js environment - try crypto.randomUUID first (Node.js 15.6.0+)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const crypto = require('crypto');
      if (crypto && typeof crypto.randomUUID === 'function') {
        uuid = crypto.randomUUID();
        if (isValidUUID(uuid)) {
          return uuid;
        }
      }
    }
  } catch (error) {
    console.warn('Node.js crypto.randomUUID failed, falling back to alternative methods:', error instanceof Error ? error.message : String(error));
  }

  try {
    // Browser environment - use crypto.randomUUID if available (modern browsers)
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      uuid = globalThis.crypto.randomUUID();
      if (isValidUUID(uuid)) {
        return uuid;
      }
    }
  } catch (error) {
    console.warn('Browser crypto.randomUUID failed, falling back to getRandomValues:', error instanceof Error ? error.message : String(error));
  }

  try {
    // Fallback to crypto.getRandomValues (both Node.js with webcrypto and browsers)
    const crypto = typeof globalThis !== 'undefined' ? globalThis.crypto :
                  typeof window !== 'undefined' ? window.crypto : null;

    if (crypto && typeof crypto.getRandomValues === 'function') {
      const randomBytes = crypto.getRandomValues(new Uint8Array(16));

      // Set version (4) and variant bits according to RFC 4122
      randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // Version 4
      randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // Variant bits

      uuid = Array.from(randomBytes, (byte, index) => {
        const hex = byte.toString(16).padStart(2, '0');
        // Add hyphens at correct positions
        if (index === 4 || index === 6 || index === 8 || index === 10) {
          return '-' + hex;
        }
        return hex;
      }).join('');

      if (isValidUUID(uuid)) {
        return uuid;
      }
    }
  } catch (error) {
    console.warn('crypto.getRandomValues failed, falling back to Math.random:', error instanceof Error ? error.message : String(error));
  }

  // Final fallback using Math.random with better entropy
  console.warn('Using Math.random fallback for UUID generation - not cryptographically secure');

  let timestamp = Date.now();
  let performanceNow = 0;

  try {
    // Add performance counter for better entropy if available
    performanceNow = typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
  } catch (e) {
    // Performance API not available
  }

  uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16 + timestamp + performanceNow) % 16 | 0;
    timestamp = Math.floor(timestamp / 16);
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  if (!isValidUUID(uuid)) {
    throw new Error('Failed to generate valid UUID after all attempts');
  }

  return uuid;
}

// UUID validation function
function isValidUUID(uuid: string): boolean {
  if (typeof uuid !== 'string') {
    return false;
  }

  // Standard UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
  private tariffSettings: any = null;
  private readonly VERSION = '1.0.0';

  constructor(rules: PricingRule[], locationHandicaps: LocationHandicap[], tariffSettings?: any) {
    this.rules = rules.sort((a, b) => a.priority - b.priority);
    this.locationHandicaps = locationHandicaps.filter(h => h.isActive);
    this.tariffSettings = tariffSettings || null;
  }

  /**
   * Calculate a deterministic estimate based on input parameters
   * The same input will always produce the same output
   */
  public calculateEstimate(input: EstimateInput, calculatedBy: string): EstimateResult {
    // Create deterministic hash of input for reproducibility
    const inputHash = this.createDeterministicHash(input);

    // Start with base price calculation
    const basePrice = this.calculateBasePrice(input);
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

    // Try to use Node.js crypto module if available
    try {
      const crypto = require('crypto');
      if (crypto && crypto.createHash) {
        return crypto.createHash('sha256').update(inputString).digest('hex');
      }
    } catch (e) {
      // crypto module not available
    }

    // Fallback to a simple string hash for browsers (less secure but deterministic)
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Calculate base price before applying rules and handicaps
   */
  private calculateBasePrice(input: EstimateInput): number {
    if (this.tariffSettings) {
      try {
        return this.calculateBasePriceFromTariff(input);
      } catch (error) {
        console.warn('Failed to calculate from tariff, using legacy:', error instanceof Error ? error.message : String(error));
        return this.calculateBasePriceLegacy(input);
      }
    }

    return this.calculateBasePriceLegacy(input);
  }

  /**
   * Calculate base price using tariff settings
   */
  private calculateBasePriceFromTariff(input: EstimateInput): number {
    const dayOfWeek = this.getDayOfWeek(input.moveDate || new Date());

    switch (input.service) {
      case 'local':
        return this.calculateLocalRate(input, dayOfWeek);
      case 'long_distance':
        return this.calculateLongDistanceRate(input);
      case 'storage':
        return this.calculateStorageRate(input);
      case 'packing_only':
        return this.calculatePackingRate(input, dayOfWeek);
      default:
        return this.calculateBasePriceLegacy(input);
    }
  }

  /**
   * Legacy base price calculation (hardcoded values)
   */
  private calculateBasePriceLegacy(input: EstimateInput): number {
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
   * Get day of week from date
   */
  private getDayOfWeek(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    return days[date.getDay()];
  }

  /**
   * Calculate local move rate from tariff settings
   */
  private calculateLocalRate(input: EstimateInput, dayOfWeek: string): number {
    if (!this.tariffSettings?.hourlyRates) {
      console.warn('No hourly rates in tariff settings, using legacy');
      return this.calculateBasePriceLegacy(input);
    }

    const { hourlyRates } = this.tariffSettings;

    // Find rate for crew size
    const rateEntry = hourlyRates.rates?.find((r: any) => r.crewSize === input.crewSize);
    if (!rateEntry) {
      console.warn(`No hourly rate found for crew size ${input.crewSize}, using legacy`);
      return this.calculateBasePriceLegacy(input);
    }

    // Get hourly rate for day
    const hourlyRate = rateEntry[dayOfWeek];
    if (!hourlyRate) {
      console.warn(`No hourly rate found for ${dayOfWeek}, using legacy`);
      return this.calculateBasePriceLegacy(input);
    }

    // Get minimum hours
    const minHours = hourlyRates.minHours?.[dayOfWeek] || 2;

    // Calculate billable hours
    const duration = input.estimatedDuration || 2;
    const billableHours = Math.max(duration, minHours);

    return hourlyRate * billableHours;
  }

  /**
   * Calculate packing rate from tariff settings
   */
  private calculatePackingRate(input: EstimateInput, dayOfWeek: string): number {
    if (!this.tariffSettings?.packingRates) {
      console.warn('No packing rates in tariff settings, using legacy');
      return this.calculateBasePriceLegacy(input);
    }

    const { packingRates } = this.tariffSettings;

    // Find rate for crew size
    const rateEntry = packingRates.rates?.find((r: any) => r.crewSize === input.crewSize);
    if (!rateEntry) {
      console.warn(`No packing rate found for crew size ${input.crewSize}, using legacy`);
      return this.calculateBasePriceLegacy(input);
    }

    // Get hourly rate for day
    const hourlyRate = rateEntry[dayOfWeek];
    if (!hourlyRate) {
      console.warn(`No packing rate found for ${dayOfWeek}, using legacy`);
      return this.calculateBasePriceLegacy(input);
    }

    const duration = input.estimatedDuration || 2;
    return hourlyRate * duration;
  }

  /**
   * Calculate long distance rate from tariff settings
   */
  private calculateLongDistanceRate(input: EstimateInput): number {
    if (!this.tariffSettings?.distanceRates) {
      console.warn('No distance rates in tariff settings, using legacy');
      return this.calculateBasePriceLegacy(input);
    }

    // Find active by_weight distance rate
    const distanceRate = this.tariffSettings.distanceRates.find(
      (r: any) => r.isActive && r.type === 'by_weight'
    );

    if (!distanceRate) {
      console.warn('No active by_weight distance rate found, using legacy');
      return this.calculateBasePriceLegacy(input);
    }

    // Find applicable bracket
    const bracket = distanceRate.brackets?.find(
      (b: any) => input.totalWeight >= b.min && input.totalWeight < b.max
    );

    if (!bracket) {
      console.warn(`No distance rate bracket found for weight ${input.totalWeight}, using legacy`);
      return this.calculateBasePriceLegacy(input);
    }

    return input.totalWeight * bracket.rate;
  }

  /**
   * Calculate storage rate from tariff settings
   */
  private calculateStorageRate(input: EstimateInput): number {
    // Storage rates might come from a specific rate table in future
    // For now, use legacy calculation
    return this.calculateBasePriceLegacy(input);
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

    // NEW: Check tariff settings for percentage-based handicap
    if (this.tariffSettings?.handicaps) {
      try {
        const tariffHandicap = this.tariffSettings.handicaps.find(
          (h: any) => h.isActive && this.matchesHandicap(h, handicap)
        );

        if (tariffHandicap?.percentage) {
          // Apply percentage-based surcharge
          const percentageImpact = currentPrice * (tariffHandicap.percentage / 100);

          // Check if multiplier applies (e.g., per flight of stairs)
          if (tariffHandicap.isMultiplier && tariffHandicap.category === 'stairs') {
            const multiplier = this.getStairsMultiplier(handicap, input);
            impact = percentageImpact * multiplier;
          } else {
            impact = percentageImpact;
          }

          finalPrice = currentPrice + impact;
          return {
            impact: Math.round(impact * 100) / 100,
            finalPrice: Math.round(finalPrice * 100) / 100
          };
        }
      } catch (error) {
        console.warn('Failed to apply tariff handicap, using legacy:', error instanceof Error ? error.message : String(error));
      }
    }

    // LEGACY: Use fixed amounts and multipliers
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
   * Match tariff handicap to location handicap
   */
  private matchesHandicap(tariffHandicap: any, locationHandicap: LocationHandicap): boolean {
    // Match by category
    if (tariffHandicap.category === 'stairs' && locationHandicap.id.includes('stairs')) return true;
    if (tariffHandicap.category === 'elevator' && locationHandicap.id.includes('elevator')) return true;
    if (tariffHandicap.category === 'long_carry' && locationHandicap.id.includes('long_carry')) return true;

    // Match by name (partial)
    if (tariffHandicap.name.toLowerCase().includes('flight') && locationHandicap.id.includes('stairs')) return true;
    if (tariffHandicap.name.toLowerCase().includes('elevator') && locationHandicap.id.includes('elevator')) return true;

    return false;
  }

  /**
   * Get stairs multiplier based on flight count
   */
  private getStairsMultiplier(handicap: LocationHandicap, input: EstimateInput): number {
    let totalFlights = 0;

    if (handicap.id.includes('pickup')) {
      totalFlights += input.pickup.stairsCount || 0;
    }

    if (handicap.id.includes('delivery')) {
      totalFlights += input.delivery.stairsCount || 0;
    }

    return Math.max(totalFlights, 1);
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

  /**
   * Calculate required crew size based on volume using tariff settings
   * Falls back to default logic if tariff settings not available
   */
  public calculateRequiredCrew(cubicFeet: number): number {
    if (!this.tariffSettings?.autoPricing?.crewRequired) {
      // Default: 2 crew for < 800cf, 3 for < 1500cf, 4 for larger
      if (cubicFeet < 800) return 2;
      if (cubicFeet < 1500) return 3;
      return 4;
    }

    const { crewRequired } = this.tariffSettings.autoPricing;

    // Sort by minCubicFeet ascending
    const sorted = [...crewRequired].sort((a: any, b: any) => a.minCubicFeet - b.minCubicFeet);

    // Find first crew size where cubic feet is below threshold
    for (const entry of sorted) {
      if (cubicFeet < entry.minCubicFeet) {
        return entry.crewSize;
      }
    }

    // If volume exceeds all thresholds, return largest crew
    return sorted[sorted.length - 1]?.crewSize || 4;
  }

  /**
   * Calculate required truck count based on volume using tariff settings
   * Falls back to default logic if tariff settings not available
   */
  public calculateRequiredTrucks(cubicFeet: number): number {
    if (!this.tariffSettings?.autoPricing?.trucksRequired) {
      // Default: 1 truck per 1500 cf
      return Math.max(1, Math.ceil(cubicFeet / 1500));
    }

    const { trucksRequired } = this.tariffSettings.autoPricing;

    // Sort by minCubicFeet ascending
    const sorted = [...trucksRequired].sort((a: any, b: any) => a.minCubicFeet - b.minCubicFeet);

    // Find first truck count where cubic feet is below threshold
    for (const entry of sorted) {
      if (cubicFeet < entry.minCubicFeet) {
        return entry.truckCount;
      }
    }

    // If volume exceeds all thresholds, return largest count
    return sorted[sorted.length - 1]?.truckCount || 1;
  }

  /**
   * Estimate duration based on volume and crew ability using tariff settings
   * Falls back to default logic if tariff settings not available
   */
  public estimateDuration(cubicFeet: number, crewSize: number): number {
    if (!this.tariffSettings?.autoPricing?.crewAbility) {
      // Default: ~100 cubic feet per hour per 2-person crew
      return Math.ceil(cubicFeet / (50 * crewSize));
    }

    const maxHours = this.tariffSettings.autoPricing.maxHoursPerJob || 12;
    const { crewAbility } = this.tariffSettings.autoPricing;

    const ability = crewAbility.find((c: any) => c.crewSize === crewSize);
    if (!ability) {
      return Math.ceil(cubicFeet / (50 * crewSize));
    }

    const estimatedHours = cubicFeet / ability.volumeCapacity;
    return Math.min(Math.ceil(estimatedHours), maxHours);
  }
}