import Swal from "sweetalert2";
import { toast } from "react-toastify";

async function handelExceptions(error) {
  Swal.fire("Failed", "Please try again!", "error");
}

async function handelNotificationSwal(message, icon) {
  Swal.fire({
    icon: icon,
    title: message,
    showConfirmButton: false,
    timer: 1500,
  });
}

async function handelNotificationToastInfo(message) {
  toast.info(message, {
    position: toast.POSITION.TOP_CENTER,
    autoClose: 1500,
  });
}

async function handelNotificationToastError(message) {
  toast.error(message, {
    position: toast.POSITION.TOP_CENTER,
    autoClose: 1500,
  });
}

async function handelNotificationToastSuccess(message) {
  toast.success(message, {
    position: toast.POSITION.TOP_CENTER,
    autoClose: 1500,
  });
}

async function handelNotificationToastWarning(message) {
  toast.warning(message, {
    position: toast.POSITION.TOP_CENTER,
    autoClose: 1500,
  });
}

export const handelException = {
  handelExceptions,
  handelNotificationSwal,
  handelNotificationToastInfo,
  handelNotificationToastError,
  handelNotificationToastSuccess,
  handelNotificationToastWarning,
};



//Dùng import { handelException } from "./handelException"; handelException.handelNotificationSwal(response.message, "error");