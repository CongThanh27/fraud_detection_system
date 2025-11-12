import Swal from "sweetalert2";

async function notify1(title, icon, denyButtonText) {
  Swal.fire({
    icon: icon,
    title: title,
    showDenyButton: true,
    showConfirmButton: false,
    showCancelButton: false,
    denyButtonText: denyButtonText || `Try again!`,
    denyButtonColor: "#1967D2",
  }).then((result) => {
    if (result.isDenied) {
      return true;
    }
  });
}
//icon = 'warning', 'error', 'success', 'info', 'question'
async function notify2(title, icon, text, confirmButtonText, cancelButtonText) {
  return new Promise((resolve) => {
    Swal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonColor: "#1967D2",
      cancelButtonColor: "#d33",
      confirmButtonText: confirmButtonText || "Yes",
      cancelButtonText: cancelButtonText || "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

async function handelNotificationSwal(message, icon) {
  Swal.fire({
    icon: icon,
    text: message,
    showConfirmButton: false,
    timer: 1500,
  });
}

export const notify = {
  handelNotificationSwal,
  notify1,
  notify2,
};


// Dùng import { notify } from "../../../../utils/notify";  notify.notify1("Please login to use this feature", "warning", "OK");
// const handleDelete = async (collection) => {
  //   if (!userFirebaseDocument) {
  //     const check = async () => {
  //       const kq = await notify.notify2("Error", "error", "Please login to continue", "OK", null);
  //       if (kq) {
  //         navigator("/");
  //       }
  //       else
  //         return;
  //     }
  //     check();
  //   }
  //   const check = await notify.notify2("Delete", "warning", "Are you sure you want to delete?", "Yes, delete it!", "No, keep it");
  //   if (!check) return;
  //   const rs = await deleteDocument("events", collection?.documentId);
  //   if (rs) {
  //     notify.handelNotificationSwal("Deleted", "success",);
  //   }
  // }