import { CreateOrderDto } from "../use-cases/dtos/create-order-dto";
import { OrderDto } from "../use-cases/dtos/order-dto";
import ApiClient from "./api-client";

const client = new ApiClient<CreateOrderDto, OrderDto>(`/api/checkout`);

export default client;
