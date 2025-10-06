import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { AnalyticsService, PeriodFilter } from './analytics.service';
// Future imports for enhanced report generation:
// import { CustomersService } from '../customers/customers.service';
// import { JobsService } from '../jobs/jobs.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateReportDto {
  name: string;
  description: string;
  type:
    | 'revenue'
    | 'performance'
    | 'operations'
    | 'crew'
    | 'customer'
    | 'custom';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  visibility?: 'private' | 'team' | 'company';
  sharedWith?: string[];
  fileFormat?: 'pdf' | 'excel' | 'csv' | 'json';
}

export interface RevenueReportData {
  summary: {
    totalRevenue: number;
    totalJobs: number;
    averageJobValue: number;
    grossProfit: number;
    profitMargin: number;
  };
  trends: Array<{
    period: string;
    revenue: number;
    jobs: number;
    averageJobValue: number;
  }>;
  byService: Array<{
    serviceType: string;
    revenue: number;
    jobs: number;
    percentage: number;
  }>;
  byLocation: Array<{
    location: string;
    revenue: number;
    jobs: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    revenue: number;
    jobs: number;
  }>;
}

export interface PerformanceReportData {
  summary: {
    totalJobs: number;
    completedJobs: number;
    completionRate: number;
    averageJobDuration: number;
    onTimeDeliveryRate: number;
    crewUtilization: number;
  };
  jobPerformance: Array<{
    period: string;
    totalJobs: number;
    completedJobs: number;
    averageDuration: number;
    onTimeRate: number;
  }>;
  crewPerformance: Array<{
    crewId: string;
    crewName: string;
    jobsCompleted: number;
    averageRating: number;
    efficiency: number;
    hoursWorked: number;
  }>;
  serviceTypePerformance: Array<{
    serviceType: string;
    averageDuration: number;
    completionRate: number;
    customerSatisfaction: number;
  }>;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name)
    private reportModel: Model<ReportDocument>,
    private analyticsService: AnalyticsService,
    // Future services for enhanced report generation:
    // private customersService: CustomersService,
    // private jobsService: JobsService
  ) {}

  // Create a new report
  async createReport(
    createReportDto: CreateReportDto,
    createdBy: string,
  ): Promise<Report> {
    try {
      const reportId = uuidv4();

      const report = new this.reportModel({
        id: reportId,
        ...createReportDto,
        createdBy,
        status: 'pending',
        progress: 0,
      });

      const savedReport = await report.save();

      // Start report generation in background
      this.generateReportAsync(savedReport);

      this.logger.log(`Created report: ${createReportDto.name} (${reportId})`);
      return savedReport;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to create report: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  // Get reports for a user
  async getReports(
    userId: string,
    filters?: {
      type?: string;
      status?: string;
      visibility?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ reports: Report[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {
      $or: [
        { createdBy: userId },
        { sharedWith: userId },
        { visibility: 'company' },
      ],
    };

    if (filters?.type) query.type = filters.type;
    if (filters?.status) query.status = filters.status;
    if (filters?.visibility) query.visibility = filters.visibility;

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reportModel.countDocuments(query).exec(),
    ]);

    return { reports, total };
  }

  // Get report by ID
  async getReportById(reportId: string, userId: string): Promise<Report> {
    const report = await this.reportModel
      .findOne({
        id: reportId,
        $or: [
          { createdBy: userId },
          { sharedWith: userId },
          { visibility: 'company' },
        ],
      })
      .exec();

    if (!report) {
      throw new Error('Report not found or access denied');
    }

    return report;
  }

  // Generate revenue report
  async generateRevenueReport(
    period: PeriodFilter,
    _filters?: Record<string, any>,
  ): Promise<RevenueReportData> {
    try {
      this.logger.log('Generating revenue report...');

      // Get revenue analytics from analytics service
      const revenueData =
        await this.analyticsService.getRevenueAnalytics(period);
      const dashboardMetrics =
        await this.analyticsService.getDashboardMetrics(period);

      // Calculate summary metrics
      const totalRevenue = revenueData.reduce(
        (sum, item) => sum + item.totalRevenue,
        0,
      );
      const totalJobs = revenueData.reduce(
        (sum, item) => sum + item.jobCount,
        0,
      );
      const totalCost = revenueData.reduce(
        (sum, item) => sum + (item.totalCost || 0),
        0,
      );
      const grossProfit = totalRevenue - totalCost;

      // Build trends data
      const trends = revenueData.map((item) => ({
        period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        revenue: item.totalRevenue,
        jobs: item.jobCount,
        averageJobValue: item.averageJobValue,
      }));

      // Get service breakdown
      const byService = dashboardMetrics.topServices.map((service) => ({
        serviceType: service.service,
        revenue: service.revenue,
        jobs: service.count,
        percentage: (service.revenue / totalRevenue) * 100,
      }));

      // Mock data for locations and customers (would be real queries in production)
      const byLocation = [
        {
          location: 'Austin, TX',
          revenue: totalRevenue * 0.4,
          jobs: Math.floor(totalJobs * 0.35),
        },
        {
          location: 'Houston, TX',
          revenue: totalRevenue * 0.3,
          jobs: Math.floor(totalJobs * 0.25),
        },
        {
          location: 'Dallas, TX',
          revenue: totalRevenue * 0.2,
          jobs: Math.floor(totalJobs * 0.25),
        },
        {
          location: 'San Antonio, TX',
          revenue: totalRevenue * 0.1,
          jobs: Math.floor(totalJobs * 0.15),
        },
      ];

      const topCustomers = [
        {
          customerId: '1',
          customerName: 'ABC Corporation',
          revenue: totalRevenue * 0.15,
          jobs: 12,
        },
        {
          customerId: '2',
          customerName: 'XYZ Company',
          revenue: totalRevenue * 0.12,
          jobs: 8,
        },
        {
          customerId: '3',
          customerName: 'Smith Enterprises',
          revenue: totalRevenue * 0.1,
          jobs: 15,
        },
        {
          customerId: '4',
          customerName: 'Johnson LLC',
          revenue: totalRevenue * 0.08,
          jobs: 6,
        },
        {
          customerId: '5',
          customerName: 'Williams Corp',
          revenue: totalRevenue * 0.07,
          jobs: 9,
        },
      ];

      return {
        summary: {
          totalRevenue,
          totalJobs,
          averageJobValue: totalJobs > 0 ? totalRevenue / totalJobs : 0,
          grossProfit,
          profitMargin:
            totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        },
        trends,
        byService,
        byLocation,
        topCustomers,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to generate revenue report: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  // Generate performance report
  async generatePerformanceReport(
    period: PeriodFilter,
    _filters?: Record<string, any>,
  ): Promise<PerformanceReportData> {
    try {
      this.logger.log('Generating performance report...');

      const dashboardMetrics =
        await this.analyticsService.getDashboardMetrics(period);

      // Mock performance data (would be calculated from real data in production)
      const summary = {
        totalJobs: dashboardMetrics.totalJobs,
        completedJobs: Math.floor(dashboardMetrics.totalJobs * 0.94),
        completionRate: 94.2,
        averageJobDuration:
          dashboardMetrics.performanceMetrics.averageJobDuration,
        onTimeDeliveryRate: dashboardMetrics.onTimePerformance,
        crewUtilization: dashboardMetrics.crewUtilization,
      };

      // Generate mock time series data
      const jobPerformance = [];
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      const monthsDiff =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

      for (let i = 0; i <= monthsDiff; i++) {
        const date = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + i,
          1,
        );
        const monthJobs =
          Math.floor(dashboardMetrics.totalJobs / (monthsDiff + 1)) +
          Math.floor(Math.random() * 10);

        jobPerformance.push({
          period: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
          totalJobs: monthJobs,
          completedJobs: Math.floor(monthJobs * (0.9 + Math.random() * 0.1)),
          averageDuration: 4.2 + Math.random() * 1.0,
          onTimeRate: 85 + Math.random() * 15,
        });
      }

      const crewPerformance = [
        {
          crewId: 'crew-001',
          crewName: 'Team Alpha',
          jobsCompleted: 45,
          averageRating: 4.8,
          efficiency: 92.3,
          hoursWorked: 180,
        },
        {
          crewId: 'crew-002',
          crewName: 'Team Beta',
          jobsCompleted: 38,
          averageRating: 4.6,
          efficiency: 88.7,
          hoursWorked: 152,
        },
        {
          crewId: 'crew-003',
          crewName: 'Team Gamma',
          jobsCompleted: 42,
          averageRating: 4.7,
          efficiency: 90.1,
          hoursWorked: 168,
        },
        {
          crewId: 'crew-004',
          crewName: 'Team Delta',
          jobsCompleted: 35,
          averageRating: 4.5,
          efficiency: 85.9,
          hoursWorked: 140,
        },
      ];

      const serviceTypePerformance = [
        {
          serviceType: 'local',
          averageDuration: 3.5,
          completionRate: 96.2,
          customerSatisfaction: 4.7,
        },
        {
          serviceType: 'long_distance',
          averageDuration: 8.2,
          completionRate: 92.8,
          customerSatisfaction: 4.5,
        },
        {
          serviceType: 'storage',
          averageDuration: 2.1,
          completionRate: 98.1,
          customerSatisfaction: 4.8,
        },
        {
          serviceType: 'packing_only',
          averageDuration: 4.8,
          completionRate: 94.3,
          customerSatisfaction: 4.6,
        },
      ];

      return {
        summary,
        jobPerformance,
        crewPerformance,
        serviceTypePerformance,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to generate performance report: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  // Delete report
  async deleteReport(reportId: string, userId: string): Promise<void> {
    const result = await this.reportModel
      .deleteOne({
        id: reportId,
        createdBy: userId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new Error('Report not found or access denied');
    }

    this.logger.log(`Deleted report: ${reportId}`);
  }

  // Private method to generate reports asynchronously
  private async generateReportAsync(report: Report): Promise<void> {
    try {
      await this.reportModel
        .updateOne({ id: report.id }, { status: 'generating', progress: 10 })
        .exec();

      const period: PeriodFilter = {
        startDate: report.startDate,
        endDate: report.endDate,
      };

      let reportData: any;

      // Update progress
      await this.reportModel
        .updateOne({ id: report.id }, { progress: 30 })
        .exec();

      // Generate report based on type
      switch (report.type) {
        case 'revenue':
          reportData = await this.generateRevenueReport(period, report.filters);
          break;
        case 'performance':
          reportData = await this.generatePerformanceReport(
            period,
            report.filters,
          );
          break;
        default:
          throw new Error(`Unsupported report type: ${report.type}`);
      }

      // Update progress
      await this.reportModel
        .updateOne({ id: report.id }, { progress: 80 })
        .exec();

      // Simulate file generation delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Complete the report
      await this.reportModel
        .updateOne(
          { id: report.id },
          {
            status: 'completed',
            progress: 100,
            data: reportData,
            lastGenerated: new Date(),
            generationTime: 5, // Mock generation time
            queriedRecords: 1000, // Mock record count
          },
        )
        .exec();

      this.logger.log(`Completed report generation: ${report.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to generate report ${report.id}: ${errorMessage}`,
        errorStack,
      );

      await this.reportModel
        .updateOne(
          { id: report.id },
          {
            status: 'failed',
            error: errorMessage,
          },
        )
        .exec();
    }
  }
}
