import { deepStrictEqual } from 'assert';
import { Mock } from 'lite-ts-mock';

import { UpdateExpirationValueHandler as Self } from './update-expiration-handler';
import { Value } from './value';
import { ValueService } from './value-service';

describe('src/update-expiration-handler.ts', () => {
    describe('.handleDiff(value: Value, valueService: ValueService, timeValueType: number, allItems: { [no: number]: ValueTypeData; })', () => {
        it('ok', async () => {
            const self = new Self(
                null,
                async () => 100,
            );

            const ownValue = {
                2: 11
            };
            const mockValueService = new Mock<ValueService>({
                ownValue
            });
            const fn = Reflect.get(self, 'handleDiff').bind(self) as (_: Value, __: ValueService) => Promise<void>;
            await fn(
                {
                    count: 1,
                    valueType: 2
                },
                mockValueService.actual
            );
            deepStrictEqual(ownValue, {
                2: 0
            });
        });
    });
});