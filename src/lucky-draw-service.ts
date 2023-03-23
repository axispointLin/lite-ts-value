import { IUnitOfWork } from 'lite-ts-db';
import { EnumFactoryBase } from 'lite-ts-enum';
import { RpcBase } from 'lite-ts-rpc';

import { CheckNegativeValueHandler } from './check-negative-handler';
import { FilterIsReplaceValueHandler } from './filter-is-replace-handler';
import { GetTimeValueHandler } from './get-time-handler';
import { ILuckyDrawService } from './i-lucky-draw-service';
import { LuckyDrawData } from './lucky-draw-data';
import { UpdateCountValueHandler } from './update-count-handler';
import { UpdateIsReplaceValueHandler } from './update-is-replace-handler';
import { UpdateRangeValueHandler } from './update-range-handler';
import { UpdateSyncValueHandler } from './update-sync-handler';
import { Value } from './value';
import { ValueService } from './value-service';
import { ValueTypeData } from './value-type-data';
import { ValueTypeRewardAddition } from './value-type-reward-addition';
import { ValueTypeRewardOpen } from './value-type-reward-open';

export class LuckyDrawService implements ILuckyDrawService {
    private m_ValueService: ValueService;
    public get valueService() {
        if (!this.m_ValueService) {
            const getCountHandler = new GetTimeValueHandler(this.m_EnumFactory, this.m_GetNowFunc);
            const updateHandler = new FilterIsReplaceValueHandler(this.m_EnumFactory);
            updateHandler.setNext(new UpdateIsReplaceValueHandler(this.m_EnumFactory))
                .setNext(new UpdateSyncValueHandler(this.m_EnumFactory))
                .setNext(new UpdateCountValueHandler())
                .setNext(new UpdateRangeValueHandler(this.m_EnumFactory))
                .setNext(new CheckNegativeValueHandler(this.m_EnumFactory));
            this.m_ValueService = new ValueService(Promise.resolve(this.m_Values), getCountHandler, updateHandler, this.m_GetNowFunc);
        }
        return this.m_ValueService;
    }

    public constructor(
        private m_App: string,
        private m_EnumFactory: EnumFactoryBase,
        private m_Entry: LuckyDrawData,
        private m_GetNowFunc: () => Promise<number>,
        private m_Values: { [valueType: number]: number; },
        private m_Rpc: RpcBase,
    ) { }

    public async getData(uow: IUnitOfWork) {
        const level = await this.valueService.getCount(uow, this.m_Entry.upgrade.levelValueType);
        const scenes = [];
        for (const [scene, v] of Object.entries(this.m_Entry.luckyDraw)) {
            let count = v.count;
            if (v.countValueType)
                count = await this.valueService.getCount(uow, v.countValueType);

            const disable = v.limitConditions ? await this.valueService.checkConditions(uow, v.limitConditions) : false;
            scenes.push({
                scene: scene,
                count: count,
                consume: v.consume,
                disable: disable,
            });
        }

        const valueTypeDataEnum = this.m_EnumFactory.build(ValueTypeData.ctor);
        const rewardOpen = await valueTypeDataEnum.getReduce<ValueTypeRewardOpen>(ValueTypeRewardOpen.ctor);
        const rewardAddition = await valueTypeDataEnum.getReduce<ValueTypeRewardAddition>(ValueTypeRewardAddition.ctor);
        const probabilities = [];
        const rewardOpens = rewardOpen[this.m_Entry.rewards?.[0]?.[0]?.valueType];
        if (rewardOpens) {
            for (const [level, v] of Object.entries(this.m_Entry.upgrade.levels)) {
                const probability = {};
                for (const reward of rewardOpens[0]) {
                    if (!probabilities[reward.valueType]) {
                        let additionWeight = 0;
                        const additionValueType = rewardAddition[this.m_Entry.rewards[0][0].valueType]?.[reward.valueType];
                        if (additionValueType) {
                            const value = v.values.find(r => r.valueType == additionValueType);
                            if (value)
                                additionWeight = value.count;
                        }
                        probability[reward.valueType] = {
                            text: `${ValueTypeData.ctor}_${reward.valueType}_name`,
                            weight: reward.weight + additionWeight
                        };
                    }
                }
                probabilities.push({
                    level: level,
                    probability: Object.values(probability)
                });
            }
        }

        return {
            text: `${LuckyDrawData.ctor}_${this.m_Entry.value}_name`,
            exp: await this.valueService.getCount(uow, this.m_Entry.upgrade.expValueType),
            level: level,
            totalExps: this.m_Entry.upgrade.levels[level]?.exps,
            scenes: scenes,
            probabilities: probabilities
        };
    }

    public async luckyDraw(_: IUnitOfWork, scene: string) {
        return await this.m_Rpc.call<Value[]>({
            route: `/${this.m_App}/mh/lucky-draw`,
            body: {
                value: this.m_Entry.value,
                scene: scene
            },
        });
    }
}