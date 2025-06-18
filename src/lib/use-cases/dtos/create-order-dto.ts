import { CreateLocationDto } from "./create-location-dto";
import { CreateParcelDto } from "./create-parcel-dto";

export interface CreateOrderDto {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  location: CreateLocationDto;
  latest_time_of_delivery: string;
  parcel: CreateParcelDto;
}
