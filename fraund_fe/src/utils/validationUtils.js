
export const validateName = (name) => {
    const pattern = /^[a-zA-Zᄀ-힣]{1,10}$/;
    return pattern.test(name);
  };
  
  export const validatePhone = (phone) => {
    const pattern = /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/;
    return pattern.test(phone);
  };
  
  export const validateEmail = (email) => {
    const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return pattern.test(email);
  };
  
  //import { validateName, validatePhone, validateEmail } from '../../../utils/validationUtils';