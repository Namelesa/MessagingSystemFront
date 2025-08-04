export interface GroupMessage {
  id: string;
  groupId: string;
  replyFor?: string;
  sender: string;
  content: string;
  sendTime: string; 
  isDeleted: boolean;
  isEdited: boolean;
  editTime?: string | Date;
} 