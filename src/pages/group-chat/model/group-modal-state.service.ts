import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GroupModalState {
  groupInfoModalOpen: boolean;
  uploadModalOpen: boolean;
  deleteModalOpen: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GroupModalStateService {
  private stateSubject = new BehaviorSubject<GroupModalState>({
    groupInfoModalOpen: false,
    uploadModalOpen: false,
    deleteModalOpen: false
  });

  public state$: Observable<GroupModalState> = this.stateSubject.asObservable();

  get state(): GroupModalState {
    return this.stateSubject.value;
  }

  private update(updates: Partial<GroupModalState>): void {
    this.stateSubject.next({ ...this.state, ...updates });
  }

  // Group Info Modal
  get isGroupInfoModalOpen(): boolean {
    return this.state.groupInfoModalOpen;
  }

  openGroupInfoModal(): void {
    this.update({ groupInfoModalOpen: true });
  }

  closeGroupInfoModal(): void {
    this.update({ groupInfoModalOpen: false });
  }

  toggleGroupInfoModal(): void {
    this.update({ groupInfoModalOpen: !this.state.groupInfoModalOpen });
  }

  // Upload Modal
  get isUploadModalOpen(): boolean {
    return this.state.uploadModalOpen;
  }

  openUploadModal(): void {
    this.update({ uploadModalOpen: true });
  }

  closeUploadModal(): void {
    this.update({ uploadModalOpen: false });
  }

  toggleUploadModal(): void {
    this.update({ uploadModalOpen: !this.state.uploadModalOpen });
  }

  // Delete Modal
  get isDeleteModalOpen(): boolean {
    return this.state.deleteModalOpen;
  }

  openDeleteModal(): void {
    this.update({ deleteModalOpen: true });
  }

  closeDeleteModal(): void {
    this.update({ deleteModalOpen: false });
  }

  toggleDeleteModal(): void {
    this.update({ deleteModalOpen: !this.state.deleteModalOpen });
  }

  // Close all modals
  closeAllModals(): void {
    this.update({
      groupInfoModalOpen: false,
      uploadModalOpen: false,
      deleteModalOpen: false
    });
  }

  // Check if any modal is open
  isAnyModalOpen(): boolean {
    const { groupInfoModalOpen, uploadModalOpen, deleteModalOpen } = this.state;
    return groupInfoModalOpen || uploadModalOpen || deleteModalOpen;
  }

  // Reset state
  reset(): void {
    this.stateSubject.next({
      groupInfoModalOpen: false,
      uploadModalOpen: false,
      deleteModalOpen: false
    });
  }
}