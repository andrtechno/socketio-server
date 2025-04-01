# Use an official Node.js runtime as a parent image
FROM ubuntu:latest

RUN apt update && apt install -y curl git

# Set the working directory in the container
WORKDIR /socket

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs

ARG REPO_URL=https://github.com/andrtechno/socketio-server.git
RUN git clone $REPO_URL .

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port your Socket.IO server listens on
EXPOSE 3000

# Define the command to run your application
CMD [ "node", "server2.js" ]