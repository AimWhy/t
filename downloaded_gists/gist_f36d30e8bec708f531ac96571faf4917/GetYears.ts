type NumberToString<N extends number> = `${N}`;
type StringToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;

type StringToCharArr<S extends string> = S extends `${infer First}${infer Rest}` ? [First, ...StringToCharArr<Rest>] : [];
type CharArrToString<Arr extends string[]> = Arr extends [infer First extends string, ...infer Rest extends string[]] ? `${First}${CharArrToString<Rest>}` : '';

type DigitMap = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

type CharArrAddOne<Arr extends string[], Acc extends string[] = []> = Arr extends [...infer Rest extends string[], infer Last extends string]
    ? Last extends DigitMap[number]
        ? Last extends '9'
            ? CharArrAddOne<Rest, [DigitMap[Last], ...Acc]>
            : [...Rest, DigitMap[Last], ...Acc]
        : ['1', ...Acc]
    : ['1', ...Acc];

type Test1 = CharArrAddOne<['9']>
type Test2 = CharArrAddOne<['1', '9']>
type Test3 = CharArrAddOne<['1', '0', '7']>
type Test4 = CharArrAddOne<['9', '9', '9']>
type Test5 = CharArrAddOne<[]>

type AddOneByCharArr<Arr extends string[]> = StringToNumber<CharArrToString<CharArrAddOne<Arr>>>
type AddOne<T extends number> = AddOneByCharArr<StringToCharArr<NumberToString<T>>>

type Test6 = AddOne<9>
type Test7 = AddOne<19>
type Test8 = AddOne<107>
type Test9 = AddOne<999>

type BuildYearArr<BaseYear extends number, Count extends number, Acc extends number[] = [BaseYear]> =
    Acc['length'] extends Count
        ? Acc
        : Acc extends [...infer Rest extends number[], infer Last extends number] ?
            BuildYearArr<BaseYear, Count, [...Rest, Last, AddOne<Last>]>
            : []

type GetYears<BaseYear extends number, Count extends number> = BuildYearArr<BaseYear, Count>[keyof BuildYearArr<BaseYear, Count> & number];
type EightYears = GetYears<2029, 8>;
type ThreeYears = GetYears<999, 3>;