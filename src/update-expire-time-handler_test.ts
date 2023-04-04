import { deepStrictEqual } from 'assert';
import { EnumFactoryBase } from 'lite-ts-enum';
import { Mock } from 'lite-ts-mock';

import { UpdateExpireTimeValueHandler as Self } from './update-expire-time-handler';
import { ValueService } from './value-service';

describe('src/update-expire-time-handler.ts', () => {
    describe('.handleDiff(option: ValueHandlerOption, time: Time)', () => {
        it('ok', async () => {
            const mockEnumFactory = new Mock<EnumFactoryBase>();
            const self = new Self(
                async () => 100,
                mockEnumFactory.actual,
            );

            const ownValue = {
                2: 1
            };
            const mockValueService = new Mock<ValueService>({
                ownValue
            });

            const option = {
                areaNo: 0,
                value: {
                    count: 1,
                    valueType: 2
                },
                valueService: mockValueService.actual
            } as any;
            const fn = Reflect.get(self, 'handleDiff').bind(self) as (option: any, time: any) => Promise<void>;
            await fn(
                option,
                {
                    expiredOnValueType: 3,
                    expireOn: 1
                }
            );
            deepStrictEqual(ownValue, {
                2: 0,
                3: 1
            });
        });

        it('false', async () => {
            const mockEnumFactory = new Mock<EnumFactoryBase>();
            const self = new Self(
                async () => 1,
                mockEnumFactory.actual,
            );

            const ownValue = {
                2: 1
            };
            const mockValueService = new Mock<ValueService>({
                ownValue
            });

            const option = {
                areaNo: 0,
                value: {
                    count: 1,
                    valueType: 2
                },
                valueService: mockValueService.actual
            } as any;
            const fn = Reflect.get(self, 'handleDiff').bind(self) as (option: any, time: any) => Promise<void>;
            await fn(
                option,
                {
                    expiredOnValueType: 3,
                    expireOn: 100
                }
            );
            deepStrictEqual(ownValue, {
                2: 1,
                3: 100
            });
        });
    });
});