/** RFC de persona moral (12) o física (13): 3 o 4 letras, fecha AAMMDD y homoclave. */
export const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export const MENSAJE_RFC_INVALIDO = "RFC inválido: 12 o 13 caracteres";
