import { ParcelSize } from "@/lib/use-cases/dtos/create-parcel-dto";

export interface UrlQueryParams {
  api_key: string;
  size: ParcelSize;
  length: number;
  width: number;
  height: number;
  weight: number;
  fragile: boolean;
  callback_url: string;
  business_name: string;
}
