FROM node:20-alpine

# Install scan tools so the engine can run real scans in the container.
RUN apk add --no-cache nmap python3 py3-pip curl bash

# Install Trivy
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Install Checkov
RUN pip3 install checkov --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 4000
CMD ["npm", "run", "dev"]
