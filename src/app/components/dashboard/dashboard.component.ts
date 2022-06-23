import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs/';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';

import { AuthService } from '../../shared/services/auth.service';
import { Task } from '../../shared/services/task';
import { TaskDialogComponent } from '../task-dialog/task-dialog.component';
import { TaskDialogResult } from '../task-dialog/task-dialog.component';
import { AngularFireAuth } from '@angular/fire/compat/auth';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject<Task[]>([]);
  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });
  return subject;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  user = JSON.parse(localStorage.getItem('user')!);
  uid = this.user?.uid;

  todo = getObservable(this.store.collection('users/' + this.uid + '/todo'));
  inProgress = getObservable(this.store.collection('users/' + this.uid + '/inProgress'));
  done = getObservable(this.store.collection('users/' + this.uid + '/done'));

  constructor(
    private dialog: MatDialog,
    private store: AngularFirestore,
    public authService: AuthService,
    public afAuth: AngularFireAuth
  ) {}

  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    });
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
      if (!result) {
        return;
      }
      this.store.collection('users/' + this.uid + '/todo').add(result.task);
    });
  }

  path = 'users/' + this.uid + '/';

  editTask(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task,
        enableDelete: true,
      },
    });
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
      if (!result) {
        return;
      }
      if (result.delete) {
        this.store
          .collection(this.path + list)
          .doc(task.id)
          .delete();
      } else {
        this.store
          .collection(this.path + list)
          .doc(task.id)
          .update(task);
      }
    });
  }

  drop(event: CdkDragDrop<Task[] | null>): void {
    if (event.previousContainer === event.container) {
      return;
    }
    if (!event.previousContainer.data || !event.container.data) {
      return;
    }
    const item = event.previousContainer.data[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      const promise = Promise.all([
        this.store
          .collection(this.path + event.previousContainer.id)
          .doc(item.id)
          .delete(),
        this.store.collection(this.path + event.container.id).add(item),
      ]);
      return promise;
    });
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
  }
  ngOnInit(): void {
    console.log(this.uid);
  }
}

// constructor(private dialog: MatDialog, private store: AngularFirestore, public authService: AuthService) {}
