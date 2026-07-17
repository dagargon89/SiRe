<?php

declare(strict_types=1);

namespace App\Auth;

use RuntimeException;

/** Se lanza cuando un ID token de Firebase no es válido (firma, aud, iss, exp). */
class TokenInvalidException extends RuntimeException
{
}
