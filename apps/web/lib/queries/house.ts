export const GET_HOUSES = `
  query GetHouses($organizationId: String!) {
    houses(organizationId: $organizationId) {
      id
      name
      organizationId
      createdAt
      updatedAt
      residents {
        id
        userId
        role
      }
    }
  }
`;

export const GET_HOUSE = `
  query GetHouse($id: String!) {
    house(id: $id) {
      id
      name
      organizationId
      createdAt
      updatedAt
      residents {
        id
        userId
        organizationId
        role
        createdAt
      }
    }
  }
`;

export const CREATE_HOUSE = `
  mutation CreateHouse($organizationId: String!, $name: String!) {
    createHouse(organizationId: $organizationId, name: $name) {
      id
      name
      organizationId
      createdAt
      updatedAt
      residents {
        id
        userId
        role
      }
    }
  }
`;

export const UPDATE_HOUSE = `
  mutation UpdateHouse($id: String!, $name: String!) {
    updateHouse(id: $id, name: $name) {
      id
      name
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_HOUSE = `
  mutation DeleteHouse($id: String!) {
    deleteHouse(id: $id)
  }
`;

export type House = {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  residents: HouseResident[];
};

export type HouseResident = {
  id: string;
  userId: string;
  organizationId?: string;
  role: string;
  createdAt?: string;
};

export type GetHousesResponse = {
  houses: House[];
};

export type GetHouseResponse = {
  house: House | null;
};

export type CreateHouseResponse = {
  createHouse: House;
};

export type UpdateHouseResponse = {
  updateHouse: House;
};

export type DeleteHouseResponse = {
  deleteHouse: boolean;
};
