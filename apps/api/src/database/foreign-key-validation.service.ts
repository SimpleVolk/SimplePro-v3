import { Injectable, BadRequestException } from '@nestjs/common';
import mongoose from 'mongoose';

/**
 * Service for validating foreign key references in MongoDB
 * Ensures referential integrity across collections
 */
@Injectable()
export class ForeignKeyValidationService {
  /**
   * Validate that a reference exists in the target collection
   * @param modelName Name of the referenced model
   * @param id ID to validate
   * @returns Promise<boolean> True if exists, false otherwise
   */
  async validateReference(
    modelName: string,
    id: string | mongoose.Types.ObjectId
  ): Promise<boolean> {
    try {
      const model = mongoose.model(modelName);
      const exists = await model.exists({ _id: id });
      return !!exists;
    } catch (error) {
      console.error(`Error validating reference to ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Validate multiple references at once
   * @param references Array of {modelName, id} pairs
   * @returns Promise<boolean> True if all exist, throws BadRequestException otherwise
   */
  async validateReferences(
    references: Array<{ modelName: string; id: string | mongoose.Types.ObjectId; fieldName: string }>
  ): Promise<boolean> {
    for (const ref of references) {
      if (ref.id) {
        const exists = await this.validateReference(ref.modelName, ref.id);
        if (!exists) {
          throw new BadRequestException(
            `Referenced ${ref.modelName} (${ref.fieldName}) not found: ${ref.id}`
          );
        }
      }
    }
    return true;
  }

  /**
   * Create a Mongoose pre-save middleware for validating a single reference
   * @param refField Field name containing the reference ID
   * @param refModel Model name to validate against
   * @param required Whether the reference is required
   * @returns Middleware function
   */
  createSingleReferenceValidator(
    refField: string,
    refModel: string,
    required: boolean = false
  ) {
    return async function (this: any, next: Function) {
      try {
        const refValue = this[refField];

        if (!refValue) {
          if (required) {
            throw new BadRequestException(`${refField} is required`);
          }
          return next();
        }

        const model = mongoose.model(refModel);
        const exists = await model.exists({ _id: refValue });

        if (!exists) {
          throw new BadRequestException(
            `Referenced ${refModel} not found for field ${refField}: ${refValue}`
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Create a Mongoose pre-save middleware for validating multiple references
   * @param references Array of reference configurations
   * @returns Middleware function
   */
  createMultiReferenceValidator(
    references: Array<{ field: string; model: string; required?: boolean }>
  ) {
    return async function (this: any, next: Function) {
      try {
        for (const ref of references) {
          const refValue = this[ref.field];

          if (!refValue) {
            if (ref.required) {
              throw new BadRequestException(`${ref.field} is required`);
            }
            continue;
          }

          const model = mongoose.model(ref.model);
          const exists = await model.exists({ _id: refValue });

          if (!exists) {
            throw new BadRequestException(
              `Referenced ${ref.model} not found for field ${ref.field}: ${refValue}`
            );
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Create a validator for array references (e.g., assignedCrew)
   * @param arrayField Field name containing array of references
   * @param refField Sub-field containing the ID
   * @param refModel Model to validate against
   * @returns Middleware function
   */
  createArrayReferenceValidator(
    arrayField: string,
    refField: string,
    refModel: string
  ) {
    return async function (this: any, next: Function) {
      try {
        const arrayValue = this[arrayField];

        if (!arrayValue || !Array.isArray(arrayValue) || arrayValue.length === 0) {
          return next();
        }

        const model = mongoose.model(refModel);

        for (const item of arrayValue) {
          const refId = item[refField];
          if (refId) {
            const exists = await model.exists({ _id: refId });
            if (!exists) {
              throw new BadRequestException(
                `Referenced ${refModel} not found in ${arrayField}.${refField}: ${refId}`
              );
            }
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
