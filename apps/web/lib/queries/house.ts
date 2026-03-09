export const GET_HOUSES = `
  query GetHouses($organizationId: String!) {
    houses(organizationId: $organizationId) {
      id
      name
      organizationId
      voterUserId
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
      voterUserId
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
  voterUserId: string | null;
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

export const ASSIGN_RESIDENT_TO_HOUSE = `
  mutation AssignResidentToHouse($userId: String!, $houseId: String!) {
    assignResidentToHouse(userId: $userId, houseId: $houseId) {
      id
      userId
      houseId
      role
    }
  }
`;

export const REMOVE_RESIDENT_FROM_HOUSE = `
  mutation RemoveResidentFromHouse($userId: String!, $organizationId: String!) {
    removeResidentFromHouse(userId: $userId, organizationId: $organizationId) {
      id
      userId
      houseId
      role
    }
  }
`;

export type AssignResidentResponse = {
  assignResidentToHouse: HouseResident;
};

export type RemoveResidentResponse = {
  removeResidentFromHouse: HouseResident;
};

export const SET_HOUSE_VOTER = `
  mutation SetHouseVoter($houseId: String!, $targetUserId: String!) {
    setHouseVoter(houseId: $houseId, targetUserId: $targetUserId) {
      id
      voterUserId
    }
  }
`;

export type SetHouseVoterResponse = {
  setHouseVoter: { id: string; voterUserId: string | null };
};
