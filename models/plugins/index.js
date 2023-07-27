export const toJSONPlugin = (schema) => {
  schema.method("toJSON", function () {
    const obj = this.toObject({ virtuals: true });
    obj.id = obj._id;
    delete obj["__v"];
    return obj;
  });
};
