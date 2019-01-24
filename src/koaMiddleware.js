const debug = require("debug")
const swaggerCombine = require("swagger-combine")
const sway = require("sway")
const { ValidationError } = require("./errors")

module.exports.createKoaMiddleware = async (
  swaggerIndexFile,
  swayOptions = {} // https://github.com/apigee-127/sway/blob/master/docs/API.md#swaycreateoptions--object
) => {
  const combinedContent = await swaggerCombine(swaggerIndexFile)
  const apiSpec = await sway.create({
    definition: combinedContent,
    ...swayOptions
  })
  return async (ctx, next) => {
    const { method, path } = ctx
    const routeSpec = apiSpec.getOperation(ctx.req)
    if (!routeSpec) {
      debug(`No matched spec found for ${method} ${path}`)
      return next()
    }
    checkValidationResult(routeSpec.validateRequest(ctx.request))
    await next()
    const responseWrapper = {
      body: ctx.response.body,
      headers: ctx.response.headers,
      statusCode: ctx.status
    }
    checkValidationResult(routeSpec.validateResponse(responseWrapper))
  }
}

function checkValidationResult(validationResult) {
  if (validationResult.errors.length > 0) {
    debug("SwaggerValidationError:", validationResult)
    throw new ValidationError(validationResult)
  }

  if (validationResult.warnings.length > 0) {
    debug(`Swagger validation warning: ${validationResult.warnings}`)
  }
}
