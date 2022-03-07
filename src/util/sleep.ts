const sleep = (ms: number) =>
	new Promise((resolve, reject) => setTimeout(resolve, ms));

export default sleep;
