//SERVICES
export const example = (options: any, correlationId: string) => {
  return {
    code: 200,
    message: "Success",
    data: {},
    meta: {
      correlationId,
    },
  };
};
