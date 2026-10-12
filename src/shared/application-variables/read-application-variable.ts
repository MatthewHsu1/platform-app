// Twenty hands every run the app's variables as they are saved at its start,
// so a value saved by an earlier run is already there. Secret values are only
// readable this way: the metadata API answers them masked.
export const readApplicationVariable = async (key: string): Promise<string | undefined> => process.env[key];
