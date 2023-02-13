import { IValue } from './i-value';
import { IValueCondition } from './i-value-condition';
import { IValueService } from './i-value-service';
import { BuildNotEnoughErrorFunc } from './not-enough';
import { ValueHandelrBase } from './value-hanlder-base';

export enum RelationOperator {
    eq = '=',
    ge = '>=',
    gt = '>',
    le = '<=',
    lt = '<',
    nowDiff = 'now-diff',
    mod = '%'
}

export interface INowTime {
    unix(): Promise<number>;
}

export class ValueService implements IValueService {
    public constructor(
        protected nowTime: INowTime,
        protected ownValue: Promise<{ [valueType: number]: number }>,
        protected getCountHandler: ValueHandelrBase,
        protected updateHandler: ValueHandelrBase,
        protected buildNotEnoughErrorFunc: BuildNotEnoughErrorFunc,
    ) { }

    public async checkConditions(conditions: IValueCondition[][]) {
        if (!conditions?.length)
            return true;

        const now = await this.nowTime.unix();
        for (const r of conditions) {
            const tasks = r.map(async cr => {
                let aCount = await this.getCount(cr.valueType);
                let bCount = cr.count;
                let op: string = cr.op;
                if (cr.op.includes(RelationOperator.nowDiff)) {
                    aCount = now - aCount;
                    op = cr.op.replace(RelationOperator.nowDiff, '');
                } else if (cr.op.includes(RelationOperator.mod)) {
                    aCount = aCount % Math.floor(cr.count / 100);
                    op = cr.op.replace(RelationOperator.mod, '');
                    bCount = bCount % 100;
                }
                switch (op) {
                    case RelationOperator.ge:
                        return aCount >= bCount;
                    case RelationOperator.gt:
                        return aCount > bCount
                    case RelationOperator.le:
                        return aCount <= bCount;
                    case RelationOperator.lt:
                        return aCount < bCount;
                    default:
                        return aCount == bCount;
                }
            });
            const res = await Promise.all(tasks);
            const ok = res.every(cr => cr);
            if (ok)
                return ok;
        }

        return false;
    }

    public async checkEnough(times: number, values: IValue[]) {
        try {
            await this.checkEnough(times, values);
            return true;
        } catch {
            return false;
        }
    }

    public async getCount(valueType: number) {
        valueType = Number(valueType);
        if (isNaN(valueType))
            return 0;

        const ownValue = await this.ownValue;
        const res = {
            count: ownValue[valueType] ?? 0,
            valueType,
        };
        await this.getCountHandler?.handle?.(res);
        return res.count;
    }

    public async tryCheckEnough(times: number, values: IValue[]) {
        for (const r of values) {
            const count = await this.getCount(r.valueType);
            if (count + r.count * times < 0) {
                throw this.buildNotEnoughErrorFunc(
                    Math.abs(r.count * times),
                    count,
                    r.valueType,
                );
            }
        }
    }

    public async update(values: IValue[]) {
        if (!values?.length)
            return;

        for (const r of values) {
            r.valueType = Number(r.valueType);
            if (isNaN(r.valueType))
                continue;

            r.count = Number(r.count);
            if (isNaN(r.count))
                continue;

            await this.updateHandler.handle(r);
        }
    }
}