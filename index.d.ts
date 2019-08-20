
declare namespace form {

	class FormPipe {
		pipe(a: any): any;
		on(a: any, b: any): any;
	}

	class Parser {
		push(a: any): any;
		process(): any;
	}

}

export as namespace form;
export = form;