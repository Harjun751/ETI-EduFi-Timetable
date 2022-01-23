# syntax=docker/dockerfile:1
## Build application

FROM node:12.18.1 AS build
WORKDIR /app

# Add package json to  workdir
COPY ["package.json", "package-lock.json*"]
# Install all required  packages
RUN npm install

# Add source code to workdir
COPY . .

CMD ["npm", "run", "start"]

# ## Deploy app using distroless image
# FROM gcr.io/distroless/nodejs:debug
# WORKDIR /

# COPY --from=build /app /

# EXPOSE 3000

# USER nonroot:nonroot
# CMD [ "./bin/www" ]