import {
  Button, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle,
} from '@mui/material';
import { useState } from 'react';
const useConfirm = (title, message) => {
  const [promise, setPromise] = useState(null);

  const confirm = () => new Promise((resolve, reject) => {
    setPromise({ resolve });
  });

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };
  // You could replace the Dialog with your library's version
  const ConfirmationDialog = () => (
    <Dialog
      open={promise !== null}
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleConfirm}>Yes</Button>
        <Button onClick={handleCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
  return [ConfirmationDialog, confirm];
};

export default useConfirm;