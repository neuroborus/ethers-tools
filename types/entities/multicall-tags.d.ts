export type Keyable = string | number | symbol;
export type Tagable = Keyable | bigint;

export type MulticallTags = Tagable | Tagable[] | Record<Keyable, Tagable>;
