
function validateForm() {
    const password = document.getElementsByName('password')[0].value;
    const confirmPassword = document.getElementsByName('confirmPassword')[0].value;
  
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return false; // Prevent form submission
    }
  
    return true; // Allow form submission
  }
  