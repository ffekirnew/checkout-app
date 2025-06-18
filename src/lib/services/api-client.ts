import axios from "axios";

export interface FetchResponse<Entity> {
  success: boolean;
  message: string;
  data: Entity;
  errors: string[];
}

class ApiClient<CreateDto, Entity> {
  endpoint: string;
  axiosInstance;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.axiosInstance = axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_GATEWAY_API}`,
    });
  }

  create = async (
    api_key: string,
    data: CreateDto,
  ): Promise<FetchResponse<Entity>> => {
    return this.axiosInstance
      .post<FetchResponse<Entity>>(this.endpoint, data, {
        headers: {
          "x-api-key": api_key,
        },
      })
      .then((res) => res.data);
  };
}

export default ApiClient;
