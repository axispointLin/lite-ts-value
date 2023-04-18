import { EnumFactoryBase } from 'lite-ts-enum';

import { IObserver } from './i-observer';
import { ValueHandlerContext } from './value-handler-context';
import { ValueInterceptorClientHandlerBase } from './value-observer-handler-base';
import { ValueTypeData } from './value-type-data';

export class ValueInterceptorClientPredicateHandler extends ValueInterceptorClientHandlerBase {

    public static ctor = 'ValueInterceptorClientPredicateHandler';

    private m_Observer: {
        ctor: IObserver<any>;
        predicate: (valueType: ValueTypeData) => boolean;
    }[] = [];

    public constructor(
        protected m_IsValidFunc: (observer: any) => boolean,
        private m_EnumFactory: EnumFactoryBase
    ) {
        super(m_IsValidFunc);
    }

    public addObserver(predicate: (valueTypeData: ValueTypeData) => boolean, observer: IObserver<any>) {
        this.m_Observer.push({
            ctor: observer,
            predicate,
        });
    }

    public async handle(ctx: ValueHandlerContext) {
        if (this.m_Observer.length) {
            const allItem = await this.m_EnumFactory.build<ValueTypeData>(ValueTypeData.ctor, ctx.areaNo).allItem;
            if (allItem[ctx.value.valueType]) {
                for (const r of this.m_Observer) {
                    const ok = r.predicate(allItem[ctx.value.valueType]);
                    if (ok && this.m_IsValidFunc(r.ctor))
                        await r.ctor.notify(ctx);
                }
            }

        }

        await this.next?.handle(ctx);
    }

    public removeObserver(observer: IObserver<any>) {
        this.m_Observer = this.m_Observer.filter(r => r.ctor != observer);
    }
}