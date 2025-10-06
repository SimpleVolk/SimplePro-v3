import { Injectable } from '@nestjs/common';
import { DeterministicEstimator } from '@simplepro/pricing-engine';
import type { EstimateInput } from '@simplepro/pricing-engine';
import defaultRulesData from '@simplepro/pricing-engine/data/default-rules.json';
import { CreateEstimateDto } from './dto/create-estimate.dto';

@Injectable()
export class EstimatesService {
  private readonly estimator: DeterministicEstimator;

  constructor() {
    // Use type assertion to bypass TypeScript strict checks for JSON import
    this.estimator = new DeterministicEstimator(
      defaultRulesData.pricingRules as any,
      defaultRulesData.locationHandicaps as any
    );
  }

  calculateEstimate(createEstimateDto: CreateEstimateDto) {
    // Convert DTO to pricing engine input format
    const estimateInput: EstimateInput = {
      customerId: 'temp-customer',
      moveDate: new Date(createEstimateDto.moveDate),
      service: createEstimateDto.serviceType as any,

      pickup: {
        address: createEstimateDto.locations.pickup.address,
        floorLevel: Math.floor((createEstimateDto.locations.pickup.stairs || 0) / 10),
        elevatorAccess: (createEstimateDto.locations.pickup.stairs || 0) < 10,
        longCarry: (createEstimateDto.locations.pickup.longCarry || 0) > 75,
        parkingDistance: createEstimateDto.locations.pickup.parkingDistance || 0,
        accessDifficulty: this.mapDifficultyLevel(createEstimateDto.locations.pickup.difficultAccess || 1),
        stairsCount: createEstimateDto.locations.pickup.stairs || 0,
        narrowHallways: createEstimateDto.locations.pickup.narrowHallways || false,
      },

      delivery: {
        address: createEstimateDto.locations.delivery.address,
        floorLevel: Math.floor((createEstimateDto.locations.delivery.stairs || 0) / 10),
        elevatorAccess: (createEstimateDto.locations.delivery.stairs || 0) < 10,
        longCarry: (createEstimateDto.locations.delivery.longCarry || 0) > 75,
        parkingDistance: createEstimateDto.locations.delivery.parkingDistance || 0,
        accessDifficulty: this.mapDifficultyLevel(createEstimateDto.locations.delivery.difficultAccess || 1),
        stairsCount: createEstimateDto.locations.delivery.stairs || 0,
        narrowHallways: createEstimateDto.locations.delivery.narrowHallways || false,
      },

      distance: 25,
      estimatedDuration: createEstimateDto.inventory.crewSize * 2,

      rooms: [],
      totalWeight: createEstimateDto.inventory.weight,
      totalVolume: createEstimateDto.inventory.volume,

      specialItems: {
        piano: (createEstimateDto.inventory.specialItems?.piano || 0) > 0,
        antiques: (createEstimateDto.inventory.specialItems?.antiques || 0) > 0,
        artwork: (createEstimateDto.inventory.specialItems?.artwork || 0) > 0,
        fragileItems: createEstimateDto.inventory.specialItems?.fragileItems || 0,
        valuableItems: 0,
      },

      additionalServices: {
        packing: createEstimateDto.services?.packing || false,
        unpacking: false,
        assembly: createEstimateDto.services?.assembly || false,
        storage: createEstimateDto.services?.storage || false,
        cleaning: false,
      },

      isWeekend: this.isWeekend(new Date(createEstimateDto.moveDate)),
      isHoliday: false,
      seasonalPeriod: this.getSeasonalPeriod(new Date(createEstimateDto.moveDate)),

      crewSize: createEstimateDto.inventory.crewSize,
      specialtyCrewRequired: (createEstimateDto.inventory.specialItems?.piano || 0) > 0,
    };

    // Calculate estimate using the pricing engine
    const result = this.estimator.calculateEstimate(estimateInput, 'api-user');

    return {
      success: true,
      estimate: result,
      timestamp: new Date().toISOString(),
    };
  }

  private mapDifficultyLevel(level: number): 'easy' | 'moderate' | 'difficult' | 'extreme' {
    if (level <= 1) return 'easy';
    if (level <= 2) return 'moderate';
    if (level <= 3) return 'difficult';
    return 'extreme';
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private getSeasonalPeriod(date: Date): 'peak' | 'standard' | 'off_peak' {
    const month = date.getMonth();
    if (month >= 4 && month <= 8) {
      return 'peak';
    }
    return 'standard';
  }
}