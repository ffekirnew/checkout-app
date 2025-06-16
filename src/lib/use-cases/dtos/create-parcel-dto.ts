export enum ParcelSize {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}

export interface CreateParcelDto {
  size: ParcelSize;
  length: number;
  width: number;
  height: number;
  weight: number;
  fragile: boolean;
}
