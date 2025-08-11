export interface GroupMessage {
  id: string;
  groupId: string;
  replyFor?: string;
  sender: string;
  content: string;
  sendTime: string; 
  isDeleted: boolean;
  deletedAt?: string | Date;
  isEdited: boolean;
  editTime?: string | Date;
} 