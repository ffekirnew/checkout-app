import { useState, useCallback } from "react";
import orderClient from "@/lib/services/order-client";
import { CreateOrderDto } from "@/lib/use-cases/dtos/create-order-dto";
import { OrderDto } from "@/lib/use-cases/dtos/order-dto";

const useCreateOrder = () => {
  const [data, setData] = useState<OrderDto | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const mutate = useCallback(async (api_key: string, order: CreateOrderDto) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await orderClient.create(api_key, order);
      setData(res.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    data,
    error,
    isLoading,
  };
};

export default useCreateOrder;
