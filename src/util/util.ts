export const sleep = (ms: number) =>
	new Promise((resolve, reject) => setTimeout(resolve, ms));

export const filterPromise = (
	values: any,
	filterFunc: (value: any, i: number) => Promise<boolean>
) =>
	Promise.all(values.map(filterFunc)).then((booleans) =>
		values.filter((_: any, i: number) => booleans[i])
	);
