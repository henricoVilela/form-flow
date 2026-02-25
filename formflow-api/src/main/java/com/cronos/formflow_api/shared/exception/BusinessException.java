package com.cronos.formflow_api.shared.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    /**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	private final String code;

    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
}
