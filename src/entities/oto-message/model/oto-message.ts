export interface OtoMessage {
    messageId: string;
    sender: string;
    recipient: string;
    content: string;
    sentAt: string | Date;
    isEdited?: boolean;
    editedAt?: string | Date;
    replyFor?: string;
    isDeleted?: boolean;
    deletedAt?: string | Date;
    deleteType?: 'soft' | 'hard';
  }
  