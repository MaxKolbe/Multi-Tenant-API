//SERVICES

export const signup = (options: any, correlationId: string) => {
  return {
    code: 200,
    message: "",
    data: {},
    meta: {
      correlationId,
    },
  };
};

export const login = (options: any, correlationId: string) => {
  return {
    code: 200,
    message: "",
    data: {},
    meta: {
      correlationId,
    },
  };
};

export const logout = (rawRefreshToken: string) => {
  return;
};

export const refresh = (rawRefreshToken: string, correlationId: string, deviceInfo: string) => {


  return {
    code: 200,
    message: "",
    data: {},
    meta: {
      sub: "",
      accessToken: "",
      refreshToken: "",
      correlationId,
    },
  };
};
