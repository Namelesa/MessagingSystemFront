export interface GroupMember {
  nickName: string;
  image: string;
}

export interface GroupInfoData {
  groupId: string;
  groupName: string;
  description: string;
  admin: string;
  image: string;
  members: GroupMember[];
  users: string[];
  rowVersion: string;
}

export interface GroupInfoResponse {
  success: boolean;
  message: string | null;
  data: GroupInfoData;
} 