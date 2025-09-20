export class CreateEstimateDto {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  serviceType!: 'local' | 'long_distance' | 'packing_only';
  moveDate!: string;

  inventory!: {
    weight: number;
    volume: number;
    crewSize: number;
    specialItems?: {
      piano?: number;
      antiques?: number;
      artwork?: number;
      fragileItems?: number;
    };
  };

  locations!: {
    pickup: {
      address: string;
      stairs?: number;
      longCarry?: number;
      difficultAccess?: number;
      parkingDistance?: number;
      narrowHallways?: boolean;
    };
    delivery: {
      address: string;
      stairs?: number;
      longCarry?: number;
      difficultAccess?: number;
      parkingDistance?: number;
      narrowHallways?: boolean;
    };
  };

  services?: {
    packing?: boolean;
    assembly?: boolean;
    storage?: boolean;
    storageDuration?: number;
  };
}