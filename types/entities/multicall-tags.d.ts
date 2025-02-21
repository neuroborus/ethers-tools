type Keyable = string | number | symbol;
type Tagable = Keyable | bigint;

export type MulticallTags = Tagable | Tagable[] | Record<Keyable, Tagable>;
